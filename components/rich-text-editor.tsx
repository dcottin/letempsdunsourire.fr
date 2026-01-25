"use client"

import { useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import { useEditor, EditorContent, Extension, Node, mergeAttributes, InputRule, PasteRule } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon, ListIcon, ListOrderedIcon, RotateCcwIcon, TagIcon } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

const TAG_LABELS: Record<string, string> = {
    "{{client_name}}": "Nom du client",
    "{{client_phone}}": "Téléphone client",
    "{{client_email}}": "Email client",
    "{{client_address}}": "Adresse client",
    "{{doc_number}}": "Numéro document",
    "{{doc_type}}": "Type de document",
    "{{company_name}}": "Votre entreprise",
    "{{event_date}}": "Date événement",
    "{{event_time}}": "Heure début",
    "{{event_end_time}}": "Heure fin",
    "{{event_location}}": "Lieu événement",
    "{{total_amount}}": "Prix TTC",
    "{{deposit_amount}}": "Montant Acompte",
    "{{balance_amount}}": "Montant Solde",
    "{{company_logo}}": "Logo Entreprise",
    "{{signature_date}}": "Date de signature",
    "{{signature_link}}": "Lien de signature",
};

interface RichTextEditorProps {
    value: string
    onChange: (html: string) => void
    onFocus?: (ref: RichTextEditorRef) => void
    placeholder?: string
    minHeight?: string
    singleLine?: boolean
    theme?: 'indigo' | 'purple' | 'emerald' | 'pink'
    className?: string
    contentClassName?: string
}

export interface RichTextEditorRef {
    insertText: (text: string) => void
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
    ({ value, onChange, onFocus, placeholder = "Rédigez votre message...", minHeight = "200px", singleLine = false, theme = 'indigo', className = "", contentClassName }, ref) => {
        const lastValueRef = useRef<string | null>(null);
        const timerRef = useRef<NodeJS.Timeout | null>(null);

        // Cleanup timer on unmount
        useEffect(() => {
            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
            };
        }, []);

        const normalizeHtml = (html: string) => {
            if (!html) return "";
            let normalized = html.replace(/<span [^>]*data-id="(\{\{[a-zA-Z0-9_]+\}\})"[^>]*>.*?<\/span>/g, "$1");
            if (singleLine) {
                normalized = normalized.replace(/^<p>/, '').replace(/<\/p>$/, '');
            }
            return normalized;
        };

        const editor = useEditor({
            extensions: [
                StarterKit.configure({
                    heading: singleLine ? false : {},
                    bulletList: singleLine ? false : {},
                    orderedList: singleLine ? false : {},
                    codeBlock: singleLine ? false : {},
                    blockquote: singleLine ? false : {},
                }),
                Underline,
                TextStyle,
                FontSize,
                Link.configure({
                    openOnClick: false,
                    HTMLAttributes: {
                        class: 'text-indigo-600 underline cursor-pointer',
                        style: 'color: #4f46e5 !important; text-decoration: underline !important;',
                    }
                }),
                Image.configure({
                    inline: true,
                    allowBase64: true,
                }),
                Placeholder.configure({
                    placeholder: placeholder,
                }),
                Variable,
                Extension.create({
                    name: 'singleLine',
                    addKeyboardShortcuts() {
                        return {
                            Enter: () => singleLine,
                            'Shift-Enter': () => singleLine,
                        }
                    },
                }),
            ],
            immediatelyRender: false,
            editorProps: {
                attributes: {
                    class: singleLine
                        ? `focus:outline-none p-1.5 min-h-0 h-9 cursor-text select-text touch-action-manipulation bg-white text-base`
                        : `max-w-none focus:outline-none p-2 min-h-[${minHeight}] cursor-text select-text touch-action-manipulation bg-white text-base overflow-x-hidden break-words`,
                },
                handleDrop: (view, event, slice, moved) => {
                    if (!moved && event.dataTransfer && event.dataTransfer.files.length === 0) {
                        const text = event.dataTransfer.getData("text/plain");
                        if (text) {
                            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                            if (coordinates) {
                                view.dispatch(view.state.tr.insertText(text, coordinates.pos));
                                return true;
                            }
                        }
                    }
                    return false;
                },
                handlePaste: (view, event) => {
                    const html = event.clipboardData?.getData('text/html');
                    const text = event.clipboardData?.getData('text/plain');

                    if (html && html.length > 100000) {
                        view.dispatch(view.state.tr.insertText(text || ""));
                        return true;
                    }

                    if (singleLine && text) {
                        const cleanText = text.replace(/[\r\n]+/g, " ");
                        view.dispatch(view.state.tr.insertText(cleanText));
                        return true;
                    }

                    return false;
                }
            },
            onUpdate: ({ editor }) => {
                let rawHtml = editor.getHTML().replace(
                    /<span [^>]*data-id="(\{\{[a-zA-Z0-9_]+\}\})"[^>]*>.*?<\/span>/g,
                    "$1"
                );

                if (singleLine) {
                    rawHtml = rawHtml.replace(/^<p>/, '').replace(/<\/p>$/, '');
                }

                if (rawHtml === "<p></p>") rawHtml = "";

                // Debounce the update to parent to avoid lag
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    lastValueRef.current = rawHtml;
                    onChange(rawHtml)
                }, 500); // 500ms delay
            },
            onFocus: () => {
                if (onFocus && editor) {
                    onFocus({
                        insertText: (text: string) => {
                            if (!editor || editor.isDestroyed) return
                            try {
                                if (text.startsWith('{{') && text.endsWith('}}')) {
                                    editor.chain().focus().insertContent({
                                        type: 'variable',
                                        attrs: { id: text, label: TAG_LABELS[text] || text }
                                    }).run()
                                } else {
                                    editor.chain().focus().insertContent(text).run()
                                }
                            } catch (e) {
                                console.warn("Tiptap insertion failed:", e)
                            }
                        }
                    })
                }
            }
        })

        useEffect(() => {
            if (!editor || value === undefined) return;
            if (value === lastValueRef.current) return;
            if (editor.isFocused && !editor.isEmpty) return;

            const currentNormalized = normalizeHtml(editor.getHTML());
            const valueNormalized = normalizeHtml(value);

            if (currentNormalized === valueNormalized) return;

            lastValueRef.current = value;

            const transformed = value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match) => {
                const label = TAG_LABELS[match] || match;
                return `<span data-variable="" data-id="${match}" data-label="${label}" class="variable-badge">${label}</span>`;
            });

            editor.commands.setContent(singleLine ? `<p>${transformed}</p>` : transformed, { emitUpdate: false });
        }, [editor, value]);

        useImperativeHandle(ref, () => ({
            insertText: (text: string) => {
                if (editor && !editor.isDestroyed) {
                    try {
                        if (text.startsWith('{{') && text.endsWith('}}')) {
                            editor.chain().focus().insertContent({
                                type: 'variable',
                                attrs: { id: text, label: TAG_LABELS[text] || text }
                            }).run()
                        } else {
                            editor.chain().focus().insertContent(text).run()
                        }
                    } catch (e) {
                        console.warn("Tiptap imperative insertion failed:", e)
                    }
                }
            }
        }))

        if (!editor) {
            return null
        }

        const themeColors = {
            indigo: { text: "text-indigo-600", border: "border-indigo-100", ring: "focus-within:ring-indigo-500/20", borderFocus: "focus-within:border-indigo-400", toggleBg: "data-[state=on]:bg-indigo-50", toggleText: "data-[state=on]:text-indigo-600" },
            purple: { text: "text-purple-600", border: "border-purple-100", ring: "focus-within:ring-purple-500/20", borderFocus: "focus-within:border-purple-400", toggleBg: "data-[state=on]:bg-purple-50", toggleText: "data-[state=on]:text-purple-600" },
            emerald: { text: "text-emerald-600", border: "border-emerald-100", ring: "focus-within:ring-emerald-500/20", borderFocus: "focus-within:border-emerald-400", toggleBg: "data-[state=on]:bg-emerald-50", toggleText: "data-[state=on]:text-emerald-600" },
            pink: { text: "text-pink-600", border: "border-pink-100", ring: "focus-within:ring-pink-500/20", borderFocus: "focus-within:border-pink-400", toggleBg: "data-[state=on]:bg-pink-50", toggleText: "data-[state=on]:text-pink-600" },
        }[theme];

        return (
            <div
                className={`rte-theme-${theme} border rounded-md overflow-hidden bg-white shadow-sm focus-within:ring-2 ${themeColors.ring} ${themeColors.borderFocus} transition-all flex flex-col ${singleLine ? "ring-1 ring-slate-200" : ""} ${className}`}
                onClick={() => {
                    if (editor && !editor.isFocused) {
                        editor.chain().focus().run()
                    }
                }}
            >
                <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-slate-50/50">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-8 sm:h-7 gap-1 px-2 ${themeColors.text} ${themeColors.border} bg-white font-bold shadow-sm shrink-0`}>
                                <TagIcon className="size-4 sm:size-3.5" />
                                <span className="text-[10px] hidden sm:inline">Balises</span>
                                <span className="text-[10px] sm:hidden">Tags</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto w-56">
                            <DropdownMenuLabel>Insérer une balise</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {Object.entries(TAG_LABELS).map(([tag, label]) => (
                                <DropdownMenuItem
                                    key={tag}
                                    onClick={() => {
                                        editor.chain().focus().insertContent({
                                            type: 'variable',
                                            attrs: { id: tag, label: label }
                                        }).run()
                                    }}
                                    className="cursor-pointer"
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold text-xs">{label}</span>
                                        <code className="text-[10px] text-slate-400">{tag}</code>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Toolbar separator only if we have more items */}
                    {!singleLine && (
                        <>
                            <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />
                            <Select
                                value={editor.getAttributes('textStyle').fontSize || "16"}
                                onValueChange={(value) => (editor.chain().focus() as any).setFontSize(value).run()}
                            >
                                <SelectTrigger className="h-8 sm:h-7 w-[65px] border-slate-200 bg-white shadow-sm focus:ring-0 gap-1 text-[10px] px-1 shrink-0">
                                    <SelectValue placeholder="14" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12" className="text-xs">12px</SelectItem>
                                    <SelectItem value="14" className="text-xs">14px</SelectItem>
                                    <SelectItem value="16" className="text-xs">16px</SelectItem>
                                    <SelectItem value="18" className="text-xs">18px</SelectItem>
                                    <SelectItem value="20" className="text-xs">20px</SelectItem>
                                    <SelectItem value="24" className="text-xs">24px</SelectItem>
                                    <SelectItem value="30" className="text-xs">30px</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />

                            <div className="flex items-center gap-0.5 shrink-0">
                                <Toggle
                                    size="sm"
                                    className={`h-8 w-8 sm:h-7 sm:w-7 p-0 border border-slate-200 bg-white ${themeColors.toggleBg} ${themeColors.toggleText} shadow-sm`}
                                    pressed={editor.isActive('bold')}
                                    onPressedChange={() => editor.chain().focus().toggleBold().run()}
                                >
                                    <BoldIcon className="size-4 sm:size-3.5" />
                                </Toggle>
                                <Toggle
                                    size="sm"
                                    className={`h-8 w-8 sm:h-7 sm:w-7 p-0 border border-slate-200 bg-white ${themeColors.toggleBg} ${themeColors.toggleText} shadow-sm`}
                                    pressed={editor.isActive('italic')}
                                    onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                                >
                                    <ItalicIcon className="size-4 sm:size-3.5" />
                                </Toggle>
                                <Toggle
                                    size="sm"
                                    className={`h-8 w-8 sm:h-7 sm:w-7 p-0 border border-slate-200 bg-white ${themeColors.toggleBg} ${themeColors.toggleText} shadow-sm`}
                                    pressed={editor.isActive('underline')}
                                    onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                                >
                                    <UnderlineIcon className="size-4 sm:size-3.5" />
                                </Toggle>
                            </div>

                            <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />

                            <div className="flex items-center gap-0.5 shrink-0">
                                <Toggle
                                    size="sm"
                                    className={`h-8 w-8 sm:h-7 sm:w-7 p-0 border border-slate-200 bg-white ${themeColors.toggleBg} ${themeColors.toggleText} shadow-sm`}
                                    pressed={editor.isActive('bulletList')}
                                    onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                                >
                                    <ListIcon className="size-4 sm:size-3.5" />
                                </Toggle>
                                <Toggle
                                    size="sm"
                                    className={`h-8 w-8 sm:h-7 sm:w-7 p-0 border border-slate-200 bg-white ${themeColors.toggleBg} ${themeColors.toggleText} shadow-sm`}
                                    pressed={editor.isActive('orderedList')}
                                    onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                                >
                                    <ListOrderedIcon className="size-4 sm:size-3.5" />
                                </Toggle>
                            </div>

                            <div className="w-px h-4 bg-slate-200 mx-0.5 shrink-0" />

                            <Button variant="outline" size="sm" className="h-8 w-8 sm:h-7 sm:w-7 p-0 border-slate-200 bg-white shrink-0 shadow-sm" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
                                <RotateCcwIcon className="size-4 sm:size-3.5" />
                            </Button>
                        </>
                    )}
                </div>

                <EditorContent
                    editor={editor}
                    className={singleLine
                        ? "min-h-0 max-h-12 overflow-hidden"
                        : contentClassName || `min-h-[150px]`
                    }
                />
                <style jsx global>{`
                    .variable-badge {
                        background-color: #eef2ff;
                        color: #4338ca;
                        padding: 0px 4px;
                        border-radius: 4px;
                        border: 1px solid #c7d2fe;
                        font-size: inherit;
                        font-family: inherit;
                        font-weight: bold;
                        box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.05);
                        margin: 0 1px;
                        display: inline-block;
                        line-height: inherit;
                        vertical-align: baseline;
                    }
                    .variable-badge:hover {
                        background-color: #e0e7ff;
                    }
                    /* Theme overrides for badges */
                    .rte-theme-purple .variable-badge {
                        background-color: #f3e8ff;
                        color: #7e22ce;
                        border-color: #e9d5ff;
                    }
                    .rte-theme-purple .variable-badge:hover { background-color: #f3e8ff; }

                    .rte-theme-emerald .variable-badge {
                        background-color: #ecfdf5;
                        color: #047857;
                        border-color: #a7f3d0;
                    }
                    .rte-theme-emerald .variable-badge:hover { background-color: #d1fae5; }

                    .rte-theme-pink .variable-badge:hover { background-color: #fce7f3; }
                    
                    /* Global contenteditable fix for iOS */
                    [contenteditable] {
                        -webkit-user-select: text !important;
                        user-select: text !important;
                    }

                    .ProseMirror {
                        user-select: text !important;
                        -webkit-user-select: text !important;
                        -webkit-touch-callout: default !important;
                        cursor: text;
                        overflow-wrap: break-word;
                        word-break: break-word;
                        overflow-x: hidden;
                        min-height: 100%;
                    }
                    .ProseMirror * {
                        user-select: text !important;
                        -webkit-user-select: text !important;
                    }
                    .ProseMirror p {
                        margin: 0 !important;
                    }
                    .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 {
                        font-weight: 700 !important;
                        margin: 0.5em 0 !important;
                    }
                    .ProseMirror ul {
                        list-style-type: disc;
                        padding-left: 1.5em;
                        margin: 0.5em 0;
                    }
                    .ProseMirror ol {
                        list-style-type: decimal;
                        padding-left: 1.5em;
                        margin: 0.5em 0;
                    }
                    .ProseMirror blockquote {
                        border-left: 3px solid #e2e8f0;
                        padding-left: 1em;
                        margin-left: 0;
                        font-style: italic;
                    }
                    .ProseMirror a, .ProseMirror a:visited, .ProseMirror a:hover {
                        color: #4f46e5 !important;
                        text-decoration: underline !important;
                        cursor: pointer !important;
                    }
                `}</style>
            </div>
        )
    }
)

RichTextEditor.displayName = "RichTextEditor"

const Variable = Node.create({
    name: 'variable',
    group: 'inline',
    inline: true,
    selectable: false,
    draggable: false,
    atom: true,

    addAttributes() {
        return {
            id: {
                default: null,
                parseHTML: element => element.getAttribute('data-id'),
                renderHTML: attributes => ({ 'data-id': attributes.id }),
            },
            label: {
                default: null,
                parseHTML: element => element.getAttribute('data-label'),
                renderHTML: attributes => ({ 'data-label': attributes.label }),
            },
        }
    },

    parseHTML() {
        return [{ tag: 'span[data-variable]' }]
    },

    renderHTML({ node }) {
        return [
            'span',
            {
                'data-variable': '',
                'data-id': node.attrs.id,
                'data-label': node.attrs.label,
                class: 'variable-badge',
            },
            node.attrs.label || node.attrs.id,
        ]
    },

    renderText({ node }) {
        return node.attrs.id
    },

    addInputRules() {
        return [
            new InputRule({
                find: /\{\{([a-zA-Z0-9_]+)\}\}$/,
                handler: ({ state, range, match }) => {
                    const { tr } = state
                    const start = range.from
                    const end = range.to
                    const id = match[0].trim()
                    const label = TAG_LABELS[id] || id
                    tr.replaceWith(start, end, this.type.create({ id, label }))
                },
            }),
        ]
    },

    addPasteRules() {
        return [
            new PasteRule({
                find: /\{\{([a-zA-Z0-9_]+)\}\}/g,
                handler: ({ state, range, match }) => {
                    const { tr } = state
                    const start = range.from
                    const end = range.to
                    const id = match[0]
                    const label = TAG_LABELS[id] || id
                    tr.replaceWith(start, end, this.type.create({ id, label }))
                },
            }),
        ]
    },
})

export const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        }
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace('px', ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) return {}
                            return { style: `font-size: ${attributes.fontSize}px` }
                        },
                    },
                },
            },
        ]
    },
    addCommands() {
        return {
            setFontSize: (fontSize: string) => ({ chain }: any) => {
                return chain().setMark('textStyle', { fontSize }).run()
            },
            unsetFontSize: () => ({ chain }: any) => {
                return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
            },
        }
    },
})
