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
            <DialogContent className="w-full h-[100dvh] max-w-none p-0 overflow-hidden flex flex-col border-none shadow-none rounded-none fixed inset-0 z-50 !max-w-none !w-full !h-[100dvh] !top-0 !left-0 !transform-none !rounded-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200 bg-background">
                <DialogHeader className="p-4 pb-0 shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <MailIcon className="size-5 text-indigo-600 shrink-0" /> <span className="truncate">Envoyer par Email</span>
                    </DialogTitle>
                    <DialogDescription>
                        Le document sera envoyé en pièce jointe (PDF) au destinataire ci-dessous.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden p-4 pt-0 flex flex-col gap-3 min-h-0">
                    {templates && templates.length > 0 && (
                        <div className="grid gap-1 shrink-0">
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
                    <div className="grid gap-1 shrink-0">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="email">À</Label>
                            {hasRIB && (
                                <div className="flex items-center space-x-2 bg-indigo-50 py-1 px-2 rounded-md border border-indigo-100 w-fit scale-90 origin-right">
                                    <Checkbox
                                        id="attach-rib"
                                        checked={attachRIB}
                                        onCheckedChange={(checked) => setAttachRIB(checked === true)}
                                        className="h-3.5 w-3.5"
                                    />
                                    <Label
                                        htmlFor="attach-rib"
                                        className="text-xs font-bold leading-none cursor-pointer text-indigo-700"
                                    >
                                        RIB
                                    </Label>
                                </div>
                            )}
                        </div>
                        <Input
                            id="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-1 shrink-0">
                        <Label htmlFor="subject">
                            Sujet
                        </Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-1 flex-1 min-h-[150px] flex flex-col">
                        <Label htmlFor="message">
                            Message
                        </Label>
                        <div className="flex-1 flex flex-col min-h-0">
                            <RichTextEditor
                                value={message}
                                onChange={setMessage}
                                placeholder="Votre message..."
                                minHeight="100%"
                                className="flex-1 min-h-0"
                            />
                        </div>

                    </div>
                </div>
                <DialogFooter className="p-4 pt-2 border-t !m-0 bg-white">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                        Annuler
                    </Button>
                    <Button onClick={handleSend} disabled={isSending} className="gap-2 sm:min-w-[120px]">
                        {isSending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> <span className="sm:inline">Envoi...</span>
                            </>
                        ) : (
                            <>
                                <SendIcon className="h-4 w-4" /> <span>Envoyer</span>
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
