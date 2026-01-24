import { useState, useEffect } from "react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/rich-text-editor"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SendIcon, Loader2, MailIcon, LinkIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface SendEmailSheetProps {
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

export function SendEmailSheet({
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
}: SendEmailSheetProps) {
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

    // Reset/Sync form when sheet opens or defaults change
    const [prevOpen, setPrevOpen] = useState(false)
    if (open && !prevOpen) {
        setTo(defaultEmail)
        setSubject(defaultSubject)
        setMessage(defaultMessage || "Bonjour,\n\nVeuillez trouver ci-joint le document concernant votre événement.\n\nCordialement,")
        setAttachRIB(hasRIB ? true : false)
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
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col gap-0 border-l border-slate-200 shadow-2xl">
                <SheetHeader className="p-4 border-b bg-slate-50/50">
                    <SheetTitle className="flex items-center gap-2 text-indigo-900">
                        <MailIcon className="size-5 text-indigo-600" /> Envoyer par Email
                    </SheetTitle>
                    <SheetDescription>
                        Le document sera envoyé en pièce jointe (PDF).
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    {templates && templates.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modèle</Label>
                            <Select onValueChange={handleTemplateChange}>
                                <SelectTrigger className="w-full bg-slate-50/50">
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

                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Destinataire</Label>
                            {hasRIB && (
                                <div className="flex items-center space-x-2 bg-indigo-50 py-1 px-2 rounded-md border border-indigo-100">
                                    <Checkbox
                                        id="attach-rib"
                                        checked={attachRIB}
                                        onCheckedChange={(checked) => setAttachRIB(checked === true)}
                                        className="h-3.5 w-3.5"
                                    />
                                    <Label htmlFor="attach-rib" className="text-xs font-bold cursor-pointer text-indigo-700">
                                        Joindre RIB
                                    </Label>
                                </div>
                            )}
                        </div>
                        <Input
                            id="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            className="bg-slate-50/50"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="subject" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sujet</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="bg-slate-50/50"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="message" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</Label>
                        <RichTextEditor
                            value={message}
                            onChange={setMessage}
                            placeholder="Votre message..."
                            minHeight="200px"
                            autoGrow={true}
                        />
                        {signingLink && (
                            <div className="flex justify-end mt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7 gap-1.5 text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                                    onClick={() => setMessage(prev => prev + `\n\nPour signer votre contrat en ligne, cliquez sur ce lien : ${signingLink}`)}
                                >
                                    <LinkIcon className="size-3" /> Insérer le lien de signature
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <SheetFooter className="p-4 border-t bg-slate-50/50 sm:justify-between flex-row items-center gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending} className="flex-1 sm:flex-none">
                        Annuler
                    </Button>
                    <Button onClick={handleSend} disabled={isSending} className="flex-1 sm:flex-none gap-2 bg-indigo-600 hover:bg-indigo-700">
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
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
