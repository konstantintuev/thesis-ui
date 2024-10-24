"use client"

import React, { Component } from "react"

import type { PDFDocumentProxy } from "pdfjs-dist"

interface Props {
  /** See `GlobalWorkerOptionsType`. */
  workerSrc?: string | undefined

  url: string
  beforeLoad: JSX.Element
  errorMessage?: JSX.Element
  children: (pdfDocument: PDFDocumentProxy) => JSX.Element
  onError?: (error: Error) => void
  cMapUrl?: string
  cMapPacked?: boolean
}

interface State {
  pdfDocument: PDFDocumentProxy | null
  error: Error | null
}

export class PdfLoader extends Component<Props, State> {
  state: State = {
    pdfDocument: null,
    error: null
  }

  documentRef = React.createRef<HTMLElement>()

  componentDidMount() {
    this.loadPdfJs()
  }

  componentWillUnmount() {
    const { pdfDocument: discardedDocument } = this.state
    if (discardedDocument) {
      discardedDocument.destroy()
    }
  }

  loadPdfJs = () => {
    const isLegacy = this.isOldWebkit()
    const pdfJsUrl = isLegacy
      ? 'https://unpkg.com/pdfjs-dist@3.10.111/legacy/build/pdf.js'  // Safari < 17 (legacy version)
      : 'https://unpkg.com/pdfjs-dist@4.7.76/build/pdf.mjs'          // Latest version for other browsers

    const workerUrl = isLegacy
      ? 'https://unpkg.com/pdfjs-dist@3.10.111/legacy/build/pdf.worker.js'
      : 'https://unpkg.com/pdfjs-dist@4.7.76/build/pdf.worker.mjs'

    const viewerUrl = isLegacy
      ? 'https://unpkg.com/pdfjs-dist@3.10.111/web/pdf_viewer.js'
      : 'https://unpkg.com/pdfjs-dist@4.7.76/web/pdf_viewer.mjs'

    if (window.pdfjsLib) {
      this.load()
      console.log("Skipped loading pdfjs...")
      return
    }
    const scriptExists = document.querySelector(`script[src="${pdfJsUrl}"]`)
    if (scriptExists) {
      this.load()
      console.log("Skipped loading pdfjs...")
      return
    }

    const script: HTMLScriptElement = document.createElement('script')
    script.src = pdfJsUrl;
    if (!isLegacy) {
      script.type = "module"
      script.async = true
    }

    script.onload = () => {
      console.log("LOADED pdfjs")
      const pdfjsLib = window.pdfjsLib

      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

      const viewerScript: HTMLScriptElement = document.createElement('script')
      viewerScript.src = viewerUrl
      if (!isLegacy) {
        viewerScript.type = "module"
        viewerScript.async = true
      }

      viewerScript.onload = () => {
        console.log("LOADED pdf viewer")
        this.load()
      };

      document.body.appendChild(viewerScript)
    };

    document.body.appendChild(script)

    // Add the css for the viewer before other css so we can override it
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    // Old css of pdf_viewer have issues (svg images to be loaded don't exist)
    link.href = isLegacy
      ? 'https://unpkg.com/pdfjs-dist@4.7.76/web/pdf_viewer.css'
      : 'https://unpkg.com/pdfjs-dist@4.7.76/web/pdf_viewer.css';
    const firstCss = document.head.querySelector('link[rel="stylesheet"]')

    if (firstCss) {
      document.head.insertBefore(link, firstCss)
    } else {
      document.head.appendChild(link)
    }
  };

  componentDidUpdate({ url }: Props) {
    if (this.props.url !== url && window.pdfjsLib) {
      this.load()
    }
  }

  componentDidCatch(error: Error) {
    const { onError } = this.props

    if (onError) {
      onError(error)
    }

    this.setState({ pdfDocument: null, error })
  }

  load() {
    if (typeof Promise.withResolvers === "undefined") {
      if (window)
        // @ts-expect-error This does not exist outside of polyfill which this is doing
        window.Promise.withResolvers = function () {
          let resolve, reject
          const promise = new Promise((res, rej) => {
            resolve = res
            reject = rej
          })
          return { promise, resolve, reject }
        }
    }

    const { ownerDocument = document } = this.documentRef.current || {}
    const { url, cMapUrl, cMapPacked, workerSrc } = this.props
    const { pdfDocument: discardedDocument } = this.state
    this.setState({ pdfDocument: null, error: null })

    Promise.resolve()
      .then(() => discardedDocument?.destroy())
      .then(() => {
        if (!url) {
          return
        }

        const document = {
          ...this.props,
          ownerDocument,
          cMapUrl,
          cMapPacked
        }

        return window.pdfjsLib.getDocument(document).promise.then(pdfDocument => {
          this.setState({ pdfDocument })
        })
      })
      .catch(e => this.componentDidCatch(e))
  }

  render() {
    const { children, beforeLoad } = this.props
    const { pdfDocument, error } = this.state
    return (
      <>
        <span ref={this.documentRef} />
        {error
          ? this.renderError()
          : !pdfDocument || !children
            ? beforeLoad
            : children(pdfDocument)}
      </>
    )
  }

  renderError() {
    const { errorMessage } = this.props
    if (errorMessage) {
      return React.cloneElement(errorMessage, { error: this.state.error })
    }

    return null
  }

  // iOS 17 minimum for new PdfJS
  // Thanks https://github.com/mdn/browser-compat-data/blob/main/browsers/safari.json
  isOldWebkit() {
    const userAgent = navigator.userAgent
    const isWebKit = /AppleWebKit/.test(userAgent)

    if (!isWebKit) {
      return false
    }

    const webkitVersionMatch = userAgent.match(/AppleWebKit\/([\d.]+)/);
    if (webkitVersionMatch && webkitVersionMatch[1]) {
      const webkitVersion = webkitVersionMatch[1]
      const majorVersion = parseInt(webkitVersion.split('.')[0], 10)

      return majorVersion < 616
    }

    return false
  }
}

export default PdfLoader
