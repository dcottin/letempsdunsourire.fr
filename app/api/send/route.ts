import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { to, subject, message, attachments, fromName } = await req.json();

        const { data, error } = await resend.emails.send({
            from: `${fromName || "Le Temps d'un Sourire"} <contact@letempsdunsourire.fr>`,
            to: [to],
            subject: subject,
            attachments: attachments,
            html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <div style="white-space: pre-wrap; line-height: 1.6;">${message}</div>
        </div>
      `,
        });

        if (error) {
            return NextResponse.json({ error }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}
