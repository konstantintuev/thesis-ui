"use client"

import React, { Component } from "react"

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist"
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
    this.load()
  }

  componentWillUnmount() {
    const { pdfDocument: discardedDocument } = this.state
    if (discardedDocument) {
      discardedDocument.destroy()
    }
  }

  componentDidUpdate({ url }: Props) {
    if (this.props.url !== url) {
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

    GlobalWorkerOptions.workerSrc =
      workerSrc ??
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString()

    console.log("workerSrc", GlobalWorkerOptions.workerSrc)

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

        return getDocument(document).promise.then(pdfDocument => {
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
}

export default PdfLoader