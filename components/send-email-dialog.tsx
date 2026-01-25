import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
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

const SafeContentEditable = ({ html, onChange, className }: { html: string, onChange: (v: string) => void, className?: string }) => {
    const contentEditableRef = useRef<HTMLDivElement>(null)
    const lastHtml = useRef(html)

    // Only update the DOM if the prop changed internally from the outside (e.g. template change)
    // and it doesn't match our last known local state.
    useEffect(() => {
        if (contentEditableRef.current && html !== lastHtml.current) {
            // Check if the DOM is really different to avoid losing selection if possible,
            // though usually this condition implies a big change (template switch)
            if (contentEditableRef.current.innerHTML !== html) {
                contentEditableRef.current.innerHTML = html
            }
            lastHtml.current = html
        }
    }, [html])

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const newHtml = e.currentTarget.innerHTML
        lastHtml.current = newHtml
        onChange(newHtml)
    }

    return (
        <div
            ref={contentEditableRef}
            className={className}
            contentEditable={true}
            suppressContentEditableWarning={true}
            onInput={handleInput}
            // Initialize content once
            dangerouslySetInnerHTML={{ __html: html }}
            style={{
                WebkitUserSelect: 'text',
                userSelect: 'text',
                WebkitTouchCallout: 'default'
            }}
        />
    )
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
    }

    const [prevOpen, setPrevOpen] = useState(false)
    useEffect(() => {
        if (open && !prevOpen) {
            setTo(defaultEmail)
            setSubject(defaultSubject)
            setMessage(defaultMessage || "")
            setAttachRIB(hasRIB ? true : false)
            setSelectedTemplate("default")
        }
        setPrevOpen(open)
    }, [open, defaultEmail, defaultSubject, defaultMessage, hasRIB, prevOpen, isIOS])

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
                "p-4 pb-3 shrink-0 border-b flex flex-row items-center justify-between bg-white z-20",
                isIOS && "pt-[max(1rem,env(safe-area-inset-top))]"
            )}>
                <div className="space-y-1">
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <MailIcon className="size-5 text-indigo-600 shrink-0" /> <span className="truncate">Envoyer par Email</span>
                    </DialogTitle>
                    <DialogDescription className="text-[10px] sm:text-xs">
                        Le document sera envoyé en pièce jointe (PDF).
                    </DialogDescription>
                </div>
                {isIOS && (
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="shrink-0 -mt-2">
                        <XIcon className="size-5 text-slate-400" />
                    </Button>
                )}
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                <div className="shrink-0 space-y-3">
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

                <div className="space-y-2 pb-4">
                    <Label htmlFor="message" className="text-xs uppercase font-bold text-slate-500">Message</Label>
                    {isIOS ? (
                        <SafeContentEditable
                            html={message}
                            onChange={setMessage}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 min-h-[200px] overflow-y-auto"
                        />
                    ) : (
                        <RichTextEditor
                            value={message}
                            onChange={setMessage}
                            className="border-slate-200"
                            minHeight="250px"
                        />
                    )}
                </div>
            </div>

            <DialogFooter className={cn(
                "p-4 pt-3 border-t bg-slate-50/50 flex flex-row items-center justify-end gap-3 shrink-0 z-20",
                isIOS && "pb-[max(1rem,env(safe-area-inset-bottom))]"
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

    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    if (isIOS && open && mounted) {
        return createPortal(
            <div
                className="fixed inset-0 z-[99999] bg-white h-[100dvh] w-screen overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            >
                {content}
            </div>,
            document.body
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



