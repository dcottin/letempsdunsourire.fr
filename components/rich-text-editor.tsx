"use client"

import { useEffect, forwardRef, useImperativeHandle, useRef } from 'react'
import { useEditor, EditorContent, Extension, Node, mergeAttributes, InputRule, PasteRule } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon, ListIcon, ListOrderedIcon, RotateCcwIcon } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
};

interface RichTextEditorProps {
    value: string
    onChange: (html: string) => void
    onFocus?: (ref: RichTextEditorRef) => void
    placeholder?: string
    minHeight?: string
    singleLine?: boolean
}

export interface RichTextEditorRef {
    insertText: (text: string) => void
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
    ({ value, onChange, onFocus, placeholder = "Rédigez votre message...", minHeight = "200px", singleLine = false }, ref) => {
        // Track the last value sent to parent to avoid feedback loops
        // Initialize to null so the first pass always triggers checking (fixes tab switch empty state)
        const lastValueRef = useRef<string | null>(null);

        // Helper to normalize HTML for comparison (handles both badges and p tags)
        const normalizeHtml = (html: string) => {
            if (!html) return "";
            // 1. Convert badges back to raw tags
            let normalized = html.replace(/<span [^>]*data-id="(\{\{[a-zA-Z0-9_]+\}\})"[^>]*>.*?<\/span>/g, "$1");
            // 2. Handle singleLine p tags
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
                Image.configure({
                    inline: true,
                    allowBase64: true,
                }),
                Placeholder.configure({
                    placeholder: placeholder,
                }),
                Variable,
                // Custom extension to disable Enter key for single line
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
                        ? `focus:outline-none p-2 min-h-0 h-10 cursor-text bg-white`
                        : `prose prose-sm max-w-none focus:outline-none p-4 min-h-[${minHeight}] cursor-text bg-white`,
                },
                handleDrop: (view, event, slice, moved) => {
                    if (!moved && event.dataTransfer && event.dataTransfer.files.length === 0) {
                        const text = event.dataTransfer.getData("text/plain");
                        if (text) {
                            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                            if (coordinates) {
                                view.dispatch(view.state.tr.insertText(text, coordinates.pos));
                                return true; // handled
                            }
                        }
                    }
                    return false;
                }
            },
            onUpdate: ({ editor }) => {
                // Convert badges back to raw tags for the parent
                let rawHtml = editor.getHTML().replace(
                    /<span [^>]*data-id="(\{\{[a-zA-Z0-9_]+\}\})"[^>]*>.*?<\/span>/g,
                    "$1"
                );

                if (singleLine) {
                    // Strip <p> tags for single line output
                    rawHtml = rawHtml.replace(/^<p>/, '').replace(/<\/p>$/, '');
                }

                // If content is just an empty paragraph, consider it empty
                if (rawHtml === "<p></p>") rawHtml = "";

                lastValueRef.current = rawHtml;
                onChange(rawHtml)
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

        // Initialize and sync content
        useEffect(() => {
            if (!editor || value === undefined) return;

            // If the incoming value is what we just sent, do nothing
            if (value === lastValueRef.current) return;

            // CRITICAL FIX: If editor is focused, trust the user's input over the prop value.
            // This prevents race conditions where a lagging prop update overwrites recent keystrokes
            // (e.g. hitting Enter right after typing).
            // EXCEPTION: If the editor content is empty (just mounted), we MUST allow the prop value to populate it.
            if (editor.isFocused && !editor.isEmpty) return;

            const currentNormalized = normalizeHtml(editor.getHTML());
            const valueNormalized = normalizeHtml(value);

            // If normalized versions are equal, do nothing (avoids resetting cursor)
            if (currentNormalized === valueNormalized) return;

            // Update lastValueRef to keep track of this external update
            lastValueRef.current = value;

            const transformed = value.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match) => {
                const label = TAG_LABELS[match] || match;
                return `<span data-variable="" data-id="${match}" data-label="${label}" class="variable-badge">${label}</span>`;
            });

            // Use emitUpdate: false to avoid re-triggering onUpdate immediately
            // Save current selection to restore if needed (though we mostly block focused updates now)
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

        return (
            <div className="border rounded-md overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                {!singleLine && (
                    <div className="flex items-center gap-1 p-2 border-b bg-slate-50 overflow-x-auto">
                        <Select
                            value={editor.getAttributes('textStyle').fontSize || "16"}
                            onValueChange={(value) => (editor.chain().focus() as any).setFontSize(value).run()}
                        >
                            <SelectTrigger className="h-8 w-[70px] border-none shadow-none bg-transparent hover:bg-slate-100 focus:ring-0 gap-1">
                                <SelectValue placeholder="16" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="12">12px</SelectItem>
                                <SelectItem value="14">14px</SelectItem>
                                <SelectItem value="16">16px</SelectItem>
                                <SelectItem value="18">18px</SelectItem>
                                <SelectItem value="20">20px</SelectItem>
                                <SelectItem value="24">24px</SelectItem>
                                <SelectItem value="30">30px</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        <Toggle
                            size="sm"
                            pressed={editor.isActive('bold')}
                            onPressedChange={() => editor.chain().focus().toggleBold().run()}
                            aria-label="Bold"
                        >
                            <BoldIcon className="size-4" />
                        </Toggle>
                        <Toggle
                            size="sm"
                            pressed={editor.isActive('italic')}
                            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
                            aria-label="Italic"
                        >
                            <ItalicIcon className="size-4" />
                        </Toggle>
                        <Toggle
                            size="sm"
                            pressed={editor.isActive('underline')}
                            onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
                            aria-label="Underline"
                        >
                            <UnderlineIcon className="size-4" />
                        </Toggle>
                        <Toggle
                            size="sm"
                            pressed={editor.isActive('strike')}
                            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
                            aria-label="Strike"
                        >
                            <StrikethroughIcon className="size-4" />
                        </Toggle>

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        <Toggle
                            size="sm"
                            pressed={editor.isActive('bulletList')}
                            onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
                            aria-label="Bullet List"
                        >
                            <ListIcon className="size-4" />
                        </Toggle>
                        <Toggle
                            size="sm"
                            pressed={editor.isActive('orderedList')}
                            onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
                            aria-label="Ordered List"
                        >
                            <ListOrderedIcon className="size-4" />
                        </Toggle>

                        <div className="w-px h-6 bg-slate-200 mx-1" />

                        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Effacer le formatage">
                            <RotateCcwIcon className="size-4" />
                        </Button>
                    </div>
                )}

                <EditorContent editor={editor} className={singleLine ? "min-h-0" : "min-h-[150px]"} />
                <style jsx global>{`
                    .variable-badge {
                        background-color: #eef2ff;
                        color: #4338ca;
                        padding: 0px 4px;
                        border-radius: 4px;
                        border: 1px solid #c7d2fe;
                        font-size: inherit;
                        font-family: inherit;
                        font-weight: inherit;
                        box-shadow: 0 1px 1px 0 rgba(0, 0, 0, 0.05);
                        margin: 0 1px;
                        display: inline-block;
                        line-height: inherit;
                        vertical-align: baseline;
                    }
                    .variable-badge:hover {
                        background-color: #e0e7ff;
                    }
                    /* Styling for single-line mode to remove P margins */
                    .ProseMirror p {
                        margin: 0 !important;
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
    selectable: true,
    draggable: true,
    atom: true,
    marks: '_', // Allow marks like bold, italic, etc.

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
            // Allow styling attributes to pass through
            style: {
                default: null,
                parseHTML: element => element.getAttribute('style'),
                renderHTML: attributes => attributes.style ? { style: attributes.style } : {},
            }
        }
    },

    // ... rest of file (adjusting CSS in the style block below this node definition if needed, but I'll do it in a separate edit or same if range covers it)
    // Wait, the CSS is in the Render method of RichTextEditor component, not here.
    // I need to target the CSS block in `RichTextEditor` component for the font-weight.
    // Let me split this. First update the Node definition.

    parseHTML() {
        return [
            {
                tag: 'span[data-variable]',
            },
        ]
    },

    // This is used when editor.getHTML() is called. 
    // We WANT it to return raw tags for the backend replacement to work!
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

    // When converting to text/markdown or simplified HTML
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

                    if (start < 0 || end > state.doc.content.size || start > end) {
                        return
                    }

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

                    if (start < 0 || end > state.doc.content.size || start > end) {
                        return
                    }

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
                            if (!attributes.fontSize) {
                                return {}
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}px`,
                            }
                        },
                    },
                },
            },
        ]
    },
    addCommands() {
        return {
            setFontSize: (fontSize: string) => ({ chain }: any) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run()
            },
            unsetFontSize: () => ({ chain }: any) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run()
            },
        }
    },
})
