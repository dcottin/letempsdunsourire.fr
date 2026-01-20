import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Label } from "@/components/ui/label"
import { SendIcon, Loader2 } from "lucide-react"

interface SendEmailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultEmail: string
    defaultSubject: string
    defaultMessage?: string
    onSend: (data: { to: string; subject: string; message: string }) => Promise<void>
}

export function SendEmailDialog({
    open,
    onOpenChange,
    defaultEmail,
    defaultSubject,
    defaultMessage,
    onSend,
}: SendEmailDialogProps) {
    const [to, setTo] = useState(defaultEmail)
    const [subject, setSubject] = useState(defaultSubject)
    const [message, setMessage] = useState(defaultMessage || "Bonjour,\n\nVeuillez trouver ci-joint le document concernant votre événement.\n\nCordialement,")
    const [isSending, setIsSending] = useState(false)

    // Reset/Sync form when dialog opens or defaults change
    const [prevOpen, setPrevOpen] = useState(false)
    if (open && !prevOpen) {
        setTo(defaultEmail)
        setSubject(defaultSubject)
        setMessage(defaultMessage || "Bonjour,\n\nVeuillez trouver ci-joint le document concernant votre événement.\n\nCordialement,")
    }
    if (open !== prevOpen) {
        setPrevOpen(open)
    }

    const handleSend = async () => {
        setIsSending(true)
        try {
            await onSend({ to, subject, message })
            onOpenChange(false)
        } catch (error) {
            console.error("Error sending email:", error)
        } finally {
            setIsSending(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle>Envoyer par Email</DialogTitle>
                    <DialogDescription>
                        Le document sera envoyé en pièce jointe (PDF) au destinataire ci-dessous.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 pt-4 grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">
                            À
                        </Label>
                        <Input
                            id="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="subject">
                            Sujet
                        </Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="message">
                            Message
                        </Label>
                        <RichTextEditor
                            value={message}
                            onChange={setMessage}
                            placeholder="Votre message..."
                            minHeight="200px"
                        />
                    </div>
                </div>
                <DialogFooter className="p-6 pt-2 border-t">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                        Annuler
                    </Button>
                    <Button onClick={handleSend} disabled={isSending} className="gap-2">
                        {isSending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Envoi...
                            </>
                        ) : (
                            <>
                                <SendIcon className="h-4 w-4" /> Envoyer
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
