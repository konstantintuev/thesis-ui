import {TFunction} from "i18next";
import type * as pdfjs from "pdfjs-dist"
import type * as pdfviewer from "pdfjs-dist/web/pdf_viewer"

export {};

declare global {
  interface String {
    toTranslationKey(t: TFunction<"translation">): string;
  }

  interface Window {
    pdfjsLib: typeof pdfjs;
    pdfjsViewer: typeof pdfviewer;
  }
}