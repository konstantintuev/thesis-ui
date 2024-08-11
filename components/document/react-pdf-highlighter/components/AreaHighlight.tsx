"use client"

import React, { Component, type RefObject } from "react"

import { Rnd } from "react-rnd"
import { getPageFromElement } from "../lib/pdfjs-dom"

import "../style/AreaHighlight.css"

import type { LTWHP, ViewportHighlight } from "../types"

interface Props {
  highlight: ViewportHighlight
  onChange: (rect: LTWHP) => void
  onClick?: () => void
  isScrolledTo: boolean
}

export class AreaHighlight extends Component<Props> {
  pointer: { x: number; y: number } = { x: 0, y: 0 }

  render() {
    const { highlight, onChange, isScrolledTo, onClick, ...otherProps } =
      this.props

    return (
      <div
        className={`AreaHighlight ${
          isScrolledTo ? "AreaHighlight--scrolledTo" : ""
        }`}
        onMouseDown={e => (this.pointer = { x: e.clientX, y: e.clientY })}
        onMouseUp={e => {
          if (
            Math.abs(e.clientX - this.pointer.x) < 4 &&
            Math.abs(e.clientY - this.pointer.y) < 4
          ) {
            onClick?.()
          }
        }}
      >
        {highlight.comment ? (
          <div
            className="Highlight__emoji"
            style={{
              left: 20,
              top: highlight.position.boundingRect.top
            }}
          >
            {highlight.comment.emoji}
          </div>
        ) : null}
        <Rnd
          className="AreaHighlight__part"
          onDragStop={(_, data) => {
            const boundingRect: LTWHP = {
              ...highlight.position.boundingRect,
              top: data.y,
              left: data.x
            }

            onChange(boundingRect)
          }}
          onResizeStop={(_mouseEvent, _direction, ref, _delta, position) => {
            const boundingRect: LTWHP = {
              top: position.y,
              left: position.x,
              width: ref.offsetWidth,
              height: ref.offsetHeight,
              pageNumber: getPageFromElement(ref)?.number || -1
            }

            onChange(boundingRect)
          }}
          position={{
            x: highlight.position.boundingRect.left,
            y: highlight.position.boundingRect.top
          }}
          size={{
            width: highlight.position.boundingRect.width,
            height: highlight.position.boundingRect.height
          }}
          onClick={(event: Event) => {
            event.stopPropagation()
            event.preventDefault()
          }}
          {...otherProps}
        />
      </div>
    )
  }
}

export default AreaHighlight
