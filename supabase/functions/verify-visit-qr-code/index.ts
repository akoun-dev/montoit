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

    const { qrData } = await req.json();

    // Parse QR code data
    let parsedData: any;
    try {
      parsedData =
        typeof qrData === "string" ? JSON.parse(qrData) : qrData;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid QR code data" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { bookingId, confirmationCode } = parsedData;

    if (!bookingId || !confirmationCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing booking ID or confirmation code",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the booking with related data
    const { data: booking, error: bookingError } = await supabase
      .from("property_visit_bookings")
      .select(
        `
        *,
        slot:property_visit_slots(*),
        property:properties(title, address)
      `
      )
      .eq("id", bookingId)
      .eq("confirmation_code", confirmationCode)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Booking not found or invalid confirmation code",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user is the organizer of the visit
    const isOrganizer = booking.slot.organizer_id === user.id;

    if (!isOrganizer) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You are not authorized to verify this visit",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if payment was completed
    if (booking.payment_status !== "paid") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment not completed for this visit",
          paymentStatus: booking.payment_status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if visit is scheduled for today
    const now = new Date();
    const slotStart = new Date(booking.slot.start_time);
    const slotEnd = new Date(booking.slot.end_time);

    // Allow check-in 30 minutes before and 30 minutes after start time
    const earliestCheckIn = new Date(slotStart.getTime() - 30 * 60 * 1000);
    const latestCheckIn = new Date(slotEnd.getTime() + 30 * 60 * 1000);

    if (now < earliestCheckIn || now > latestCheckIn) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This visit is not active at this time",
          visitTime: {
            start: booking.slot.start_time,
            end: booking.slot.end_time,
            currentTime: now.toISOString(),
          },
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if already checked in
    if (booking.visit_status === "in_progress" && booking.check_in_time) {
      return new Response(
        JSON.stringify({
          success: true,
          alreadyCheckedIn: true,
          booking: {
            id: booking.id,
            visitorName: booking.visitor_name,
            checkInTime: booking.check_in_time,
            propertyTitle: booking.property.title,
            visitStatus: booking.visit_status,
          },
          message: "Visitor already checked in",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Perform check-in
    const { error: updateError } = await supabase
      .from("property_visit_bookings")
      .update({
        visit_status: "in_progress",
        check_in_time: now.toISOString(),
        confirmed_by_organizer: true,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Check-in error:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to check in visitor",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the successful check-in
    console.log(`Visitor checked in: ${booking.visitor_name} for booking ${bookingId}`);

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          visitorName: booking.visitor_name,
          visitorPhone: booking.visitor_phone,
          numberOfVisitors: booking.number_of_visitors,
          propertyTitle: booking.property.title,
          propertyAddress: booking.property.address,
          checkInTime: now.toISOString(),
          visitStatus: "in_progress",
        },
        message: "Visitor successfully checked in. Enjoy the visit!",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in verify-visit-qr-code:", error);
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
