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

    const {
      slotId,
      propertyId,
      visitorName,
      visitorPhone,
      visitorEmail,
      numberOfVisitors = 1,
    } = await req.json();

    // Validate required fields
    if (!slotId || !propertyId || !visitorName || !visitorPhone) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: slotId, propertyId, visitorName, visitorPhone",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the visit slot
    const { data: slot, error: slotError } = await supabase
      .from("property_visit_slots")
      .select("*")
      .eq("id", slotId)
      .eq("property_id", propertyId)
      .single();

    if (slotError || !slot) {
      return new Response(
        JSON.stringify({ error: "Visit slot not found or unavailable" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if slot is available
    if (slot.status !== "available") {
      return new Response(
        JSON.stringify({ error: "This visit slot is no longer available" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if slot is in the future
    if (new Date(slot.start_time) <= new Date()) {
      return new Response(
        JSON.stringify({ error: "Cannot book past or current visit slots" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user has already booked this slot
    const { data: existingBooking } = await supabase
      .from("property_visit_bookings")
      .select("id")
      .eq("slot_id", slotId)
      .eq("visitor_id", user.id)
      .maybeSingle();

    if (existingBooking) {
      return new Response(
        JSON.stringify({ error: "You have already booked this visit slot" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate unique confirmation code
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("property_visit_bookings")
      .insert({
        slot_id: slotId,
        property_id: propertyId,
        visitor_id: user.id,
        visitor_name: visitorName,
        visitor_phone: visitorPhone,
        visitor_email: visitorEmail || user.email,
        number_of_visitors: numberOfVisitors,
        payment_amount: slot.visit_fee_amount,
        payment_status: slot.visit_fee_amount > 0 ? "pending" : "paid",
        confirmation_code: confirmationCode,
        visit_status: "scheduled",
        confirmed_by_visitor: true,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking error:", bookingError);
      return new Response(
        JSON.stringify({ error: "Failed to create booking" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate QR code data
    const qrData = {
      bookingId: booking.id,
      confirmationCode: confirmationCode,
      slotId: slotId,
      propertyId: propertyId,
      visitorId: user.id,
      timestamp: new Date().toISOString(),
    };

    // For production, you would generate an actual QR code image here
    // For now, we'll just return the data that should be encoded
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      JSON.stringify(qrData)
    )}`;

    // Update booking with QR code URL
    await supabase
      .from("property_visit_bookings")
      .update({ qr_code_url: qrCodeUrl })
      .eq("id", booking.id);

    // If visit fee is 0, the booking is complete
    if (slot.visit_fee_amount === 0) {
      // Send confirmation email/SMS
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            to: visitorEmail || user.email,
            subject: "Confirmation de visite",
            template: "visit-confirmation",
            data: {
              visitorName,
              propertyAddress: slot.meeting_point || "À confirmer",
              visitDate: new Date(slot.start_time).toLocaleDateString("fr-FR"),
              visitTime: new Date(slot.start_time).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              confirmationCode,
              instructions: slot.instructions || "",
              qrCodeUrl,
            },
          },
        });
      } catch (emailError) {
        console.error("Email error:", emailError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          confirmationCode,
          qrCodeUrl,
          visitDate: slot.start_time,
          meetingPoint: slot.meeting_point,
          instructions: slot.instructions,
          paymentRequired: slot.visit_fee_amount > 0,
          paymentAmount: slot.visit_fee_amount,
        },
        message:
          slot.visit_fee_amount > 0
            ? "Booking created. Please proceed to payment."
            : "Visit booked successfully!",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in book-property-visit:", error);
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
