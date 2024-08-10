"use client"

import React, { Component } from "react"

import "../style/Tip.css"
import { TextareaAutosize } from "@/components/ui/textarea-autosize"

interface State {
  compact: boolean
  text: string
  emoji: string
}

interface Props {
  onConfirm: (comment: { text: string; emoji: string }) => void
  onOpen: () => void
  onUpdate?: () => void
  closeTip?: () => void
  text?: string | undefined
  emoji?: string | undefined
  compact?: boolean | undefined
  onDeleteClick?: () => void | undefined
}

export class Tip extends Component<Props, State> {
  state: State = {
    compact: true,
    text: "",
    emoji: ""
  }

  textRef: React.RefObject<HTMLTextAreaElement> = React.createRef()

  componentDidMount() {
    this.setState({
      text: this.props.text ?? "",
      emoji: this.props.emoji ?? "",
      compact: this.props.compact ?? true
    })
    if (this.textRef) {
      this.textRef.current?.focus()
    }
  }

  // for TipContainer
  componentDidUpdate(nextProps: Props, nextState: State) {
    const { onUpdate } = this.props

    if (onUpdate && this.state.compact !== nextState.compact) {
      onUpdate()
    }
  }

  emojiList = ["💩", "😱", "😍", "🔥", "😳", "⚠️"]

  render() {
    const { onConfirm, onOpen } = this.props
    const { compact, text, emoji } = this.state

    return (
      <div className="Tip">
        {compact ? (
          <div
            className="Tip__compact"
            onClick={() => {
              onOpen()
              this.setState({ compact: false })
            }}
          >
            Add highlight
          </div>
        ) : (
          <form
            className="Tip__card"
            onSubmit={event => {
              event.preventDefault()
              onConfirm({ text, emoji })
            }}
          >
            <h2
              style={{
                paddingBottom: "10px"
              }}
            >
              Enter comment for the highlight:
            </h2>
            <TextareaAutosize
              className="w-full"
              placeholder="Your comment"
              value={text}
              onValueChange={event => this.setState({ text: event })}
              minRows={2}
              maxRows={6}
              textareaRef={this.textRef}
            />
            {/* Inspired from https://flowbite.com/docs/forms/radio */}
            <ul className="w-full items-center rounded-md pt-3 font-medium text-gray-900 sm:flex dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              {this.emojiList.map((_emoji, index) => (
                <li
                  key={_emoji}
                  className={
                    index === this.emojiList.length - 1
                      ? "my-2 w-full pl-0.5"
                      : "my-2 w-full border-b border-gray-200 pl-0.5 sm:border-b-0 sm:border-r dark:border-gray-600"
                  }
                >
                  <div className="flex items-center justify-start pl-0.5 pr-1">
                    <input
                      id={`horizontal-list-${_emoji}`}
                      type="radio"
                      value={_emoji}
                      name="list-radio-emoji"
                      checked={emoji === _emoji}
                      className="peer hidden"
                      onClick={() => {
                        if (this.state.emoji === _emoji) {
                          this.setState({ emoji: "" })
                        }
                      }}
                      onChange={event =>
                        this.setState({ emoji: event.target.value })
                      }
                    />
                    <label
                      htmlFor={`horizontal-list-${_emoji}`}
                      className="mx-1.5 w-full cursor-pointer text-3xl text-gray-400 transition-transform hover:scale-150 peer-checked:scale-150 peer-checked:text-gray-900 dark:text-gray-500 peer-checked:dark:text-white"
                    >
                      {_emoji}
                    </label>
                  </div>
                </li>
              ))}
            </ul>

            <div className="Tip__card__button_row">
              <input type="submit" value="Save" />
              {this.props.onDeleteClick ? (
                <button
                  type="button"
                  onClick={this.props.onDeleteClick}
                  style={{ color: "red" }}
                >
                  Delete
                </button>
              ) : undefined}
              <button type="button" onClick={this.props.closeTip}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }
}

export default Tip
