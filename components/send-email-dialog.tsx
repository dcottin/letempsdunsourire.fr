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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SendIcon, Loader2, MailIcon, LinkIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface SendEmailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultEmail: string
    defaultSubject: string
    defaultMessage?: string
    onSend: (data: { to: string; subject: string; message: string; attachRIB?: boolean }) => Promise<void>
    templates?: { id: string; name: string; subject: string; body: string }[]
    replacements?: Record<string, string>
    hasRIB?: boolean
    defaultTemplateName?: string
    signingLink?: string
}

export function SendEmailDialog({
    open,
    onOpenChange,
    defaultEmail,
    defaultSubject,
    defaultMessage,
    onSend,
    templates,
    replacements,
    hasRIB,
    defaultTemplateName = "Modèle par défaut",
    signingLink
}: SendEmailDialogProps) {
    const [to, setTo] = useState(defaultEmail)
    const [subject, setSubject] = useState(defaultSubject)
    const [message, setMessage] = useState(defaultMessage || "Bonjour,\n\nVeuillez trouver ci-joint le document concernant votre événement.\n\nCordialement,")
    const [attachRIB, setAttachRIB] = useState(false)
    const [isSending, setIsSending] = useState(false)

    // Handle template change
    const handleTemplateChange = (templateId: string) => {
        if (templateId === "default") {
            setSubject(defaultSubject)
            setMessage(defaultMessage || "")
            return
        }

        const template = templates?.find(t => t.id === templateId)
        if (template) {
            let newSubject = template.subject
            let newBody = template.body

            if (replacements) {
                Object.entries(replacements).forEach(([key, value]) => {
                    newSubject = newSubject.split(key).join(value)
                    newBody = newBody.split(key).join(value)
                })
            }

            setSubject(newSubject)
            setMessage(newBody)
        }
    }

    // Reset/Sync form when dialog opens or defaults change
    const [prevOpen, setPrevOpen] = useState(false)
    if (open && !prevOpen) {
        setTo(defaultEmail)
        setSubject(defaultSubject)
        setMessage(defaultMessage || "Bonjour,\n\nVeuillez trouver ci-joint le document concernant votre événement.\n\nCordialement,")
        setAttachRIB(hasRIB ? true : false) // Default to true if RIB exists
    }
    if (open !== prevOpen) {
        setPrevOpen(open)
    }

    const handleSend = async () => {
        setIsSending(true)
        try {
            await onSend({ to, subject, message, attachRIB })
            onOpenChange(false)
        } catch (error) {
            console.error("Error sending email:", error)
        } finally {
            setIsSending(false)
        }
    }

    const stripHtml = (html: string) => {
        return html.replace(/<[^>]*>?/gm, '');
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <MailIcon className="size-5 text-indigo-600" /> Envoyer par Email
                    </DialogTitle>
                    <DialogDescription>
                        Le document sera envoyé en pièce jointe (PDF) au destinataire ci-dessous.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 pt-4 grid gap-4">
                    {templates && templates.length > 0 && (
                        <div className="grid gap-2">
                            <Label>Choisir un modèle</Label>
                            <Select onValueChange={handleTemplateChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un modèle..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">{stripHtml(defaultTemplateName)}</SelectItem>
                                    {templates.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>{stripHtml(t.name)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
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
                        {signingLink && (
                            <div className="flex gap-2 justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7 gap-1"
                                    onClick={() => setMessage(prev => prev + `\n\nPour signer votre contrat en ligne, cliquez sur ce lien : ${signingLink}`)}
                                >
                                    <LinkIcon className="size-3" /> Insérer le lien de signature
                                </Button>
                            </div>
                        )}
                    </div>
                    {hasRIB && (
                        <div className="flex items-center space-x-2 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                            <Checkbox
                                id="attach-rib"
                                checked={attachRIB}
                                onCheckedChange={(checked) => setAttachRIB(checked === true)}
                            />
                            <Label
                                htmlFor="attach-rib"
                                className="text-sm font-medium leading-none cursor-pointer text-indigo-700"
                            >
                                Joindre mon RIB à cet email
                            </Label>
                        </div>
                    )}
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
