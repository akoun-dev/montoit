import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { bookingId, reason } = await req.json();

    if (!bookingId || !reason) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: bookingId, reason",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the booking
    const { data: booking, error: bookingError } = await supabase
      .from("property_visit_bookings")
      .select(
        `
        *,
        slot:property_visit_slots(*)
      `
      )
      .eq("id", bookingId)
      .eq("visitor_id", user.id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found or unauthorized" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if payment was made
    if (booking.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          error: "No payment was made for this booking",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if refund was already requested or processed
    if (["requested", "approved", "refunded"].includes(booking.refund_status)) {
      return new Response(
        JSON.stringify({
          error: "Refund already requested or processed",
          refundStatus: booking.refund_status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if visit fee is refundable
    if (!booking.slot.visit_fee_refundable) {
      return new Response(
        JSON.stringify({
          error: "This visit fee is non-refundable",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine if refund should be auto-approved
    const fraudReasons = [
      "fraud",
      "organizer_no_show",
      "property_not_exists",
      "false_information",
    ];
    const isAutoApprove = fraudReasons.some((fr) =>
      reason.toLowerCase().includes(fr)
    );

    const newRefundStatus = isAutoApprove ? "approved" : "requested";

    // Update booking with refund request
    const { error: updateError } = await supabase
      .from("property_visit_bookings")
      .update({
        refund_status: newRefundStatus,
        refund_reason: reason,
        fraud_reported: isAutoApprove,
        fraud_report_reason: isAutoApprove ? reason : null,
        fraud_report_date: isAutoApprove ? new Date().toISOString() : null,
        fraud_investigation_status: isAutoApprove ? "pending" : null,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Refund request error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to request refund" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If auto-approved, process refund immediately
    if (isAutoApprove) {
      // In production, this would trigger the actual refund via payment provider
      await supabase
        .from("property_visit_bookings")
        .update({
          payment_status: "refunded",
          refund_status: "refunded",
          refund_date: new Date().toISOString(),
        })
        .eq("id", bookingId);

      // Notify organizer of fraud report
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: booking.slot.organizer_id,
            subject: "Signalement de fraude sur une visite",
            template: "fraud-report-organizer",
            data: {
              bookingId,
              reason,
              visitDate: booking.slot.start_time,
            },
          },
        });
      } catch (emailError) {
        console.error("Email error:", emailError);
      }
    }

    // Notify admins
    try {
      await supabase.functions.invoke("alert-suspicious-activity", {
        body: {
          type: "refund_request",
          bookingId,
          userId: user.id,
          reason,
          isAutoApproved: isAutoApprove,
          amount: booking.payment_amount,
        },
      });
    } catch (alertError) {
      console.error("Alert error:", alertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refundStatus: newRefundStatus,
        message: isAutoApprove
          ? "Refund approved and processed immediately due to fraud detection"
          : "Refund request submitted. It will be reviewed within 48 hours.",
        estimatedRefundTime: isAutoApprove
          ? "immediate"
          : "2-5 business days after approval",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in request-visit-refund:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
