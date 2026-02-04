import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

export interface TiptapEditorHandle {
  insertQuote: (text: string, sourceUrl?: string, sourceLabel?: string) => void;
}

interface TiptapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const TiptapEditor = forwardRef<TiptapEditorHandle, TiptapEditorProps>(
  ({ content, onUpdate, placeholder = 'Start writing your story...', className = '' }, ref) => {
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Link.configure({
          autolink: true,
          openOnClick: false,
        }),
        Placeholder.configure({
          placeholder,
        }),
      ],
      content,
      onUpdate: ({ editor }) => {
        onUpdateRef.current(editor.getHTML());
      },
    });

    // Sync external content changes (e.g. when story loads)
    const isFirstRender = useRef(true);
    useEffect(() => {
      if (!editor) return;
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      const currentHTML = editor.getHTML();
      if (content !== currentHTML) {
        editor.commands.setContent(content, false);
      }
    }, [content, editor]);

    useImperativeHandle(ref, () => ({
      insertQuote(text: string, sourceUrl?: string, sourceLabel?: string) {
        if (!editor) return;
        const blockquoteContent: any[] = [
          { type: 'paragraph', content: [{ type: 'text', text }] },
        ];
        if (sourceUrl) {
          blockquoteContent.push({
            type: 'paragraph',
            content: [
              { type: 'text', text: '— ', marks: [{ type: 'italic' }] },
              {
                type: 'text',
                text: sourceLabel || sourceUrl,
                marks: [
                  { type: 'link', attrs: { href: sourceUrl, target: '_blank' } },
                  { type: 'italic' },
                ],
              },
            ],
          });
        }
        editor
          .chain()
          .focus()
          .insertContent([
            { type: 'blockquote', content: blockquoteContent },
            { type: 'paragraph' },
          ])
          .run();
      },
    }));

    return (
      <EditorContent
        editor={editor}
        className={`tiptap-editor-content ${className}`}
      />
    );
  }
);

TiptapEditor.displayName = 'TiptapEditor';

export default TiptapEditor;
