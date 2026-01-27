import { Resend } from 'resend';
import { NextResponse } from 'next/server';

// Remove top-level initialization to prevent crash on module load
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    console.log("------------------------------------------------------------------");
    console.log("API /api/send called");
    console.log("Time:", new Date().toISOString());

    // Check Env Var inside the request to ensure it's loaded
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        console.error("CRITICAL: RESEND_API_KEY is missing in environment variables.");
        return NextResponse.json({ error: "Server configuration error: Missing API Key" }, { status: 500 });
    }

    // Initialize Resend inside the handler to catch instantiation errors
    let resend;
    try {
        resend = new Resend(apiKey);
    } catch (initError: any) {
        console.error("Failed to initialize Resend client:", initError);
        return NextResponse.json({ error: "Email Service Init Failed", details: initError.message }, { status: 500 });
    }

    try {
        // buffer() or text() might be safer to inspect size before json parsing if payload is huge, 
        // but let's try standard json() first and catch errors.
        const bodyText = await req.text();
        console.log(`Request body size: ${bodyText.length} characters (~${(bodyText.length / 1024).toFixed(2)} KB)`);

        if (!bodyText) {
            console.error("Error: Request body is empty");
            return NextResponse.json({ error: "Request body is empty" }, { status: 400 });
        }

        let body;
        try {
            body = JSON.parse(bodyText);
        } catch (parseError) {
            console.error("Error parsing JSON:", parseError);
            return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
        }

        const { to, subject, message, attachments, fromName } = body;

        console.log("Parsed Payload:");
        console.log("- To:", to);
        console.log("- Subject:", subject);
        console.log("- From Name:", fromName);
        console.log("- Attachments Count:", attachments?.length || 0);

        // Validate required fields
        if (!to) {
            console.error("Validation Error: Missing 'to' field");
            return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
        }

        console.log("Attempting to send email via Resend...");
        const { data, error } = await resend.emails.send({
            from: `${fromName || "Le Temps d'un Sourire"} <contact@letempsdunsourire.fr>`,
            to: [to],
            subject: subject,
            attachments: attachments,
            html: `
                <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml">
                    <head>
                        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                        <title>${subject}</title>
                        <style>
                            body { 
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                                font-size: 16px; 
                                line-height: 1.5; 
                                color: #1e293b; 
                                margin: 0; 
                                padding: 0; 
                            }
                            p { margin: 0 !important; padding: 0 !important; min-height: 24px; }
                            strong, b { font-weight: 700 !important; color: #000000 !important; }
                            a { color: #4f46e5; text-decoration: underline; }
                        </style>
                    </head>
                    <body style="margin: 0; padding: 0;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #1e293b;">
                                    ${message}
                                </td>
                            </tr>
                        </table>
                    </body>
                </html>
            `,
        });

        if (error) {
            console.error("Resend API Error:", error);
            // Log full error object if possible
            console.error("Full Error Details:", JSON.stringify(error, null, 2));
            return NextResponse.json({ error: error.message || "Resend API Error", details: error }, { status: 500 });
        }

        console.log("Email sent successfully!");
        console.log("Response Data:", data);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Unexpected Internal Server Error:", error);
        console.error("Stack Trace:", error.stack);
        return NextResponse.json({
            error: "Internal Server Error",
            message: error.message
        }, { status: 500 });
    }
}
