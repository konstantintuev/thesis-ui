"use client"

import React, { Component } from "react"

import MouseMonitor from "./MouseMonitor"

interface Props {
  onMouseOver: (content: JSX.Element) => void
  popupContent: JSX.Element
  onMouseOut: () => void
  children: JSX.Element
  onClick?: () => void
}

interface State {
  mouseIn: boolean
}

export class Popup extends Component<Props, State> {
  state: State = {
    mouseIn: false
  }

  render() {
    const { onMouseOver, popupContent, onMouseOut, onClick } = this.props

    return (
      <div
        onClick={() => {
          onClick?.()
          this.setState({ mouseIn: false })
        }}
        onMouseOver={() => {
          this.setState({ mouseIn: true })

          onMouseOver(
            <MouseMonitor
              onMoveAway={() => {
                if (this.state.mouseIn) {
                  return
                }

                onMouseOut()
              }}
              paddingX={60}
              paddingY={30}
            >
              {popupContent}
            </MouseMonitor>
          )
        }}
        onMouseOut={() => {
          this.setState({ mouseIn: false })
        }}
      >
        {this.props.children}
      </div>
    )
  }
}

export default Popup
