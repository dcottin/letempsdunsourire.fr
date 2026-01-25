import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
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

    // Use a ref for iOS to avoid re-renders during typing
    const iosEditorRef = useRef<HTMLDivElement>(null)
    const messageRef = useRef(message)

    // Sync state to ref for sending purposes
    useEffect(() => {
        messageRef.current = message
    }, [message])

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
        setMessage(newBody)

        // Force update the native div if on iOS
        if (isIOS && iosEditorRef.current) {
            iosEditorRef.current.innerHTML = newBody
        }
    }

    const [prevOpen, setPrevOpen] = useState(false)
    useEffect(() => {
        if (open && !prevOpen) {
            setTo(defaultEmail)
            setSubject(defaultSubject)
            setMessage(defaultMessage || "")
            setAttachRIB(hasRIB ? true : false)
            setSelectedTemplate("default")

            if (isIOS && iosEditorRef.current) {
                iosEditorRef.current.innerHTML = defaultMessage || ""
            }
        }
        setPrevOpen(open)
    }, [open, defaultEmail, defaultSubject, defaultMessage, hasRIB, prevOpen, isIOS])

    const handleSend = async () => {
        setIsSending(true)
        try {
            // On iOS, convert final textarea value back to HTML format
            const finalMessage = isIOS ? message.trim().replace(/\n/g, "<br>") : message
            await onSend({ to, subject, message: finalMessage, attachRIB })
            onOpenChange(false)
        } catch (error) {
            console.error("Error sending email:", error)
        } finally {
            setIsSending(false)
        }
    }

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

    const content = (
        <div className="bg-white w-full h-full flex flex-col overflow-hidden">
            <DialogHeader className={cn(
                "px-6 py-4 shrink-0 border-b flex flex-row items-center justify-between bg-white z-20",
                isIOS && "pt-[max(1.25rem,env(safe-area-inset-top))]"
            )}>
                <div className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                        <MailIcon className="size-5 text-indigo-600 shrink-0" /> <span className="truncate">Envoyer par Email</span>
                    </DialogTitle>
                    <DialogDescription className="text-[10px] sm:text-xs">
                        Le document sera envoyé en pièce jointe (PDF).
                    </DialogDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="shrink-0 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                    <XIcon className="size-5" />
                </Button>
            </DialogHeader>

            <div className="flex-1 overflow-hidden px-6 py-6 flex flex-col gap-6">
                <div className="shrink-0 space-y-4">
                    {templates && templates.length > 0 && (
                        <div className="grid gap-1">
                            <Label className="text-xs uppercase font-bold text-slate-500">Modèle</Label>
                            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Sélectionner un modèle..." />
                                </SelectTrigger>
                                <SelectContent className="z-[10000]">
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
                            <Input
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="h-9 font-medium"
                                placeholder="Sujet de l'email..."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 flex flex-col space-y-2 pb-4 overflow-x-hidden">
                    <Label htmlFor="message" className="text-xs uppercase font-bold text-slate-500 shrink-0">Message</Label>
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                        {isIOS ? (
                            <textarea
                                id="message"
                                value={stripHtml(message)}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full flex-1 rounded-md border border-slate-200 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none overflow-auto"
                                placeholder="Rédigez votre message..."
                                style={{
                                    WebkitTapHighlightColor: 'transparent',
                                }}
                            />
                        ) : (
                            <RichTextEditor
                                value={message}
                                onChange={setMessage}
                                className="flex-1 border-slate-200 overflow-hidden"
                                contentClassName="flex-1"
                                minHeight="100%"
                            />
                        )}
                    </div>
                </div>
            </div>

            <DialogFooter className={cn(
                "px-6 py-6 border-t bg-slate-50/50 flex flex-row items-center justify-end gap-3 shrink-0 z-20",
                isIOS && "pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            )}>
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
            <div
                className="fixed inset-0 z-[9999] bg-white h-[100dvh] w-screen overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
            >
                {content}
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="fixed z-50 !w-[100vw] !h-[100dvh] !max-w-none !m-0 !rounded-none p-0 gap-0 border-none bg-white !left-0 !top-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 outline-none shadow-none overflow-hidden flex flex-col"
            >
                {content}
            </DialogContent>
        </Dialog>
    )
}



