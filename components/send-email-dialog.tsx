import { useState, useEffect } from "react"
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
import { SendIcon, Loader2, MailIcon, XIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { useIsIOS } from "@/hooks/use-ios"

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
    const isIOS = useIsIOS()
    const [to, setTo] = useState(defaultEmail)
    const [subject, setSubject] = useState(defaultSubject)
    const [message, setMessage] = useState(defaultMessage || "")
    const [attachRIB, setAttachRIB] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState("default")

    const stripHtml = (html: string) => {
        if (!html) return "";
        let text = html;
        text = text.replace(/<p[^>]*>/gi, '');
        text = text.replace(/<\/p>/gi, '\n');
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<[^>]*>?/gm, '');
        text = text.replace(/&nbsp;/g, ' ');
        return text.trim();
    }

    // Handle template change
    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplate(templateId)
        let newSubject = defaultSubject
        let newBody = defaultMessage || ""

        if (templateId !== "default") {
            const template = templates?.find(t => t.id === templateId)
            if (template) {
                newSubject = template.subject
                newBody = template.body
            }
        }

        if (replacements && templateId !== "default") {
            Object.entries(replacements).forEach(([key, value]) => {
                newSubject = newSubject.split(key).join(value)
                newBody = newBody.split(key).join(value)
            })
        }

        setSubject(newSubject)
        setMessage(isIOS ? stripHtml(newBody) : newBody)
    }

    const [prevOpen, setPrevOpen] = useState(false)
    useEffect(() => {
        if (open && !prevOpen) {
            setTo(defaultEmail)
            setSubject(defaultSubject)
            setMessage(isIOS ? stripHtml(defaultMessage || "") : (defaultMessage || ""))
            setAttachRIB(hasRIB ? true : false)
            setSelectedTemplate("default")
        }
        setPrevOpen(open)
    }, [open, defaultEmail, defaultSubject, defaultMessage, hasRIB, prevOpen, isIOS])

    const handleSend = async () => {
        setIsSending(true)
        try {
            // If on iOS, we convert plain text back to something HTML-ish for the email API
            const finalMessage = isIOS ? message.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>') : message
            await onSend({ to, subject, message: finalMessage, attachRIB })
            onOpenChange(false)
        } catch (error) {
            console.error("Error sending email:", error)
        } finally {
            setIsSending(false)
        }
    }

    const InternalContent = () => (
        <div className="flex flex-col w-full h-full bg-white overflow-hidden">
            <DialogHeader className="p-4 pb-3 shrink-0 border-b flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <MailIcon className="size-5 text-indigo-600 shrink-0" /> <span className="truncate">Envoyer par Email</span>
                    </DialogTitle>
                    <DialogDescription className="text-[10px] sm:text-xs">
                        Le document sera envoyé en pièce jointe (PDF) au destinataire ci-dessous.
                    </DialogDescription>
                </div>
                {isIOS && (
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="shrink-0 -mt-2">
                        <XIcon className="size-5 text-slate-400" />
                    </Button>
                )}
            </DialogHeader>

            <div className={`flex-1 ${isIOS ? 'overflow-y-auto' : 'overflow-hidden'} p-4 flex flex-col gap-4 pb-[env(safe-area-inset-bottom,20px)]`}>
                <div className="shrink-0 space-y-3">
                    {templates && templates.length > 0 && (
                        <div className="grid gap-1">
                            <Label className="text-xs uppercase font-bold text-slate-500">Modèle</Label>
                            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                                <SelectTrigger className="h-9">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="grid gap-1">
                            <div className="flex items-center justify-between h-5">
                                <Label htmlFor="email" className="text-xs uppercase font-bold text-slate-500">Destinataire</Label>
                                {hasRIB && (
                                    <div className="flex items-center space-x-2 bg-indigo-50 py-0.5 px-2 rounded-md border border-indigo-100 scale-90">
                                        <Checkbox
                                            id="attach-rib"
                                            checked={attachRIB}
                                            onCheckedChange={(checked) => setAttachRIB(checked === true)}
                                            className="h-3 w-3"
                                        />
                                        <Label htmlFor="attach-rib" className="text-[10px] font-bold text-indigo-700 cursor-pointer">Joindre RIB</Label>
                                    </div>
                                )}
                            </div>
                            <Input id="email" value={to} onChange={(e) => setTo(e.target.value)} className="h-9" />
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="subject" className="text-xs uppercase font-bold text-slate-500">Sujet</Label>
                            <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 min-h-[200px] gap-2">
                    <Label htmlFor="message" className="text-xs uppercase font-bold text-slate-500">Message</Label>
                    {isIOS ? (
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Écrivez votre message ici..."
                            className="flex-1 min-h-[200px] text-base border-slate-200 focus:ring-indigo-500"
                        />
                    ) : (
                        <RichTextEditor
                            value={message}
                            onChange={setMessage}
                            className="flex-1 overflow-hidden border-slate-200"
                            contentClassName="flex-1 overflow-y-auto custom-scrollbar min-h-0"
                            minHeight="100%"
                        />
                    )}
                </div>
            </div>

            <DialogFooter className="m-0 p-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] sm:pb-4 border-t bg-slate-50/50 shrink-0 flex flex-row items-center justify-end gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending} className="flex-1 sm:flex-none uppercase text-[10px] sm:text-xs font-bold tracking-wider h-10 px-3">
                    Annuler
                </Button>
                <Button onClick={handleSend} disabled={isSending} className="flex-[2] sm:flex-none gap-2 bg-indigo-600 hover:bg-indigo-700 uppercase text-[10px] sm:text-xs font-bold tracking-wider h-10 px-3 shadow-md">
                    {isSending ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Envoi...</>
                    ) : (
                        <><SendIcon className="h-4 w-4" /> Envoyer Email</>
                    )}
                </Button>
            </DialogFooter>
        </div>
    )

    if (isIOS && open) {
        return (
            <div className="fixed inset-0 z-[9999] bg-white flex flex-col overscroll-none animate-in fade-in slide-in-from-bottom-4 duration-200">
                <InternalContent />
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="fixed z-50 !w-[100vw] !h-[100dvh] !max-w-none !m-0 !rounded-none p-0 gap-0 border-none bg-white !left-0 !top-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 outline-none shadow-none overflow-hidden flex flex-col"
            >
                <InternalContent />
            </DialogContent>
        </Dialog>
    )
}


