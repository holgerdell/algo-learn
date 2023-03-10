// An abstraction for basic quiz questions. Each question has:
// - question text,
// - a list of possible answers
//
// Current features:
// - Multiple choice questions
// - Drag-and-drop sorting questions

import "microtip/microtip.css"
import { ChangeEvent, Fragment, ReactNode, useState } from "react"
import { useTranslation } from "react-i18next"
import { BiLink, BiRefresh } from "react-icons/bi"
import { GiPlayButton } from "react-icons/gi"
import { SiCheckmarx, SiIfixit } from "react-icons/si"
import { Link } from "react-router-dom"
import { playFailSound, playPassSound } from "../utils/audio"
import { AnswerBox } from "./AnswerBox"
import { Button } from "./Button"
import { SortableList } from "./SortableList"

/**
 * A container for questions.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} props.className
 * @returns {React.ReactElement}
 * @example
 * <ExerciseContainer>
 *   <ExerciseTitle title="Exercise 1" />
 *   <p>Question text</p>
 *   <ExerciseMultipleChoice>
 *     <AnswerRadio id="a1">Answer 1</AnswerRadio>
 *     <AnswerRadio id="a2">Answer 2</AnswerRadio>
 *     <AnswerRadio id="a3">Answer 3</AnswerRadio>
 *   </ExerciseMultipleChoice>
 * </ExerciseContainer>
 */
export function QuestionContainer({
  children,
  className = "",
  ...props
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div {...props} className={`mx-auto mt-5 block max-w-xl ${className}`}>
      {children}
    </div>
  )
}

export function QuestionHeader({
  title,
  regeneratable = false,
}: {
  title?: string
  regeneratable?: boolean
}) {
  const { t } = useTranslation()
  const [recentlyCopied, setRecentlyCopied] = useState(false)
  return (
    <h1>
      {title != undefined && title + " "}
      <button
        aria-label={
          (recentlyCopied ? t("copyLinkCopied") : t("copyLinkTooltip")) || ""
        }
        data-microtip-position="right"
        role="tooltip"
      >
        <Link
          to={""}
          onClick={() => {
            void navigator.clipboard
              .writeText(window.location.href)
              .then(() => setRecentlyCopied(true))
          }}
          onMouseLeave={() => {
            setTimeout(() => setRecentlyCopied(false), 200)
          }}
        >
          <BiLink className="inline" />
        </Link>
      </button>
      {regeneratable && (
        <button
          aria-label={t("generate-new-exercise-of-same-type") || ""}
          data-microtip-position="right"
          role="tooltip"
        >
          <Link to={".."} relative="path">
            <BiRefresh className="inline" />
          </Link>
        </button>
      )}
    </h1>
  )
}

export function AnswerRadio({
  id,
  onChange,
  children,
}: {
  id: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  children: ReactNode
}) {
  return (
    <div className="flex place-items-center">
      <input
        type="radio"
        name={window.location.pathname}
        id={id}
        className="peer hidden"
        onChange={onChange}
      />
      <AnswerBox TagName="label" htmlFor={id} includePeerCheckedStyle>
        {children}
      </AnswerBox>
    </div>
  )
}

export function FooterButtonText({
  mode,
}: {
  mode: "correct" | "incorrect" | "disabled" | "verify"
}) {
  return mode === "correct" || mode === "incorrect" ? (
    <>
      Continue <GiPlayButton className="inline" />
    </>
  ) : (
    <>Check</>
  )
}

export function QuestionFooter({
  mode = "disabled",
  message,
  buttonClick,
}: {
  mode?: "correct" | "incorrect" | "disabled" | "verify"
  message?: ReactNode
  buttonClick: () => void
}) {
  console.assert(
    mode === "disabled" ||
      mode === "verify" ||
      mode === "correct" ||
      mode === "incorrect"
  )
  const icon =
    mode === "correct" ? (
      <SiCheckmarx className="mr-5 inline-block text-7xl" />
    ) : mode === "incorrect" ? (
      <SiIfixit className="mr-5 inline-block text-6xl" />
    ) : null
  const backgroundColor =
    mode === "correct"
      ? "bg-green-200 dark:bg-green-700"
      : mode === "incorrect"
      ? "bg-red-200 dark:bg-red-700"
      : ""
  const textColor =
    mode === "correct"
      ? "text-green-900 dark:text-green-200"
      : mode === "incorrect"
      ? "text-red-900 dark:text-red-100"
      : ""
  const buttonColor =
    mode === "correct" || mode === "verify"
      ? "green"
      : mode === "incorrect"
      ? "red"
      : "disabled"
  return (
    <div className={`absolute bottom-0 left-0 right-0 ${backgroundColor}`}>
      <div className={`m-auto h-48 max-w-xl p-5 sm:flex sm:place-items-center`}>
        <div className={`flex place-items-center text-left ${textColor}`}>
          <div className="flex place-items-center">
            {icon}
            <div className="inline-block">{message}</div>
          </div>
        </div>
        <div className="grow"></div>
        <Button
          color={buttonColor}
          onClick={buttonClick}
          className="mt-5 ml-auto sm:m-0 sm:ml-10"
        >
          <FooterButtonText mode={mode} />
        </Button>
      </div>
    </div>
  )
}

export function ExerciseMultipleChoice({
  children,
  title,
  answers,
  regeneratable = false,
  onResult = () => {},
  allowMultiple,
}: {
  children: ReactNode
  title: string
  answers: { key: string; correct: boolean; element: ReactNode }[]
  regeneratable?: boolean
  onResult?: (result: "correct" | "incorrect" | "abort") => void
  allowMultiple?: boolean
}) {
  const correctAnswers = answers.filter((x) => x.correct).sort()
  if (correctAnswers.length === 0) {
    throw new Error(
      "ExerciseMultipleChoice: At least one correct answer must be provided"
    )
  }
  allowMultiple ??= correctAnswers.length !== 1
  const [mode, setMode] = useState(
    "disabled" as "disabled" | "verify" | "correct" | "incorrect"
  )
  const [checked, setChecked] = useState([] as Array<string>)

  function handleClick() {
    if (mode === "disabled") {
      return
    } else if (mode === "verify") {
      const isCorrect =
        checked.length === correctAnswers.length &&
        correctAnswers.every((item) => checked.includes(item.key))
      setMode(isCorrect ? "correct" : "incorrect")
      isCorrect ? playPassSound() : playFailSound()
    } else if (mode === "correct" || mode === "incorrect") {
      onResult(mode)
    }
  }
  const message =
    mode === "correct" ? (
      <b className="text-2xl">Correct!</b>
    ) : mode === "incorrect" ? (
      <>
        <b className="text-xl">
          Correct solution{correctAnswers.length > 1 ? "s" : ""}:
        </b>
        <br />
        {correctAnswers.map((item) => (
          <Fragment key="item.key">{item.element}</Fragment>
        ))}
      </>
    ) : null
  return (
    <QuestionContainer>
      <QuestionHeader title={title} regeneratable={regeneratable} />
      {children}
      <div className="mx-auto flex max-w-max flex-wrap gap-5 p-5">
        {answers.map(({ key, element }) => {
          return (
            <div key={key} className="flex place-items-center">
              <input
                type={allowMultiple ? "checkbox" : "radio"}
                name={window.location.pathname}
                id={key}
                className="peer hidden"
                onChange={(e) => {
                  setMode("verify")
                  const newChecked = allowMultiple
                    ? checked.slice().filter((x) => x !== e.target.id)
                    : []
                  if (e.target.checked) {
                    newChecked.push(e.target.id)
                  }
                  setChecked(newChecked)
                }}
                disabled={mode === "correct" || mode === "incorrect"}
              />
              <AnswerBox
                TagName="label"
                disabled={mode === "disabled"}
                htmlFor={key}
                includePeerCheckedStyle
              >
                {element}
              </AnswerBox>
            </div>
          )
        })}
      </div>
      <QuestionFooter mode={mode} message={message} buttonClick={handleClick} />
    </QuestionContainer>
  )
}

export function ExerciseSort({
  children,
  title,
  answers,
  regeneratable = false,
  onResult = () => {},
}: {
  children: ReactNode
  title: string
  answers: { key: string; element: ReactNode; correctIndex: number }[]
  regeneratable?: boolean
  onResult?: (result: "correct" | "incorrect" | "abort") => void
}) {
  const [mode, setMode] = useState(
    "verify" as "verify" | "correct" | "incorrect"
  )
  const [items, setItems] = useState(answers)

  function handleClick() {
    if (mode === "verify") {
      let isCorrect = true
      for (let i = 0; i < items.length; i++) {
        isCorrect &&= items[i].correctIndex === i
      }
      setMode(isCorrect ? "correct" : "incorrect")
      isCorrect ? playPassSound() : playFailSound()
    } else {
      console.assert(mode === "correct" || mode === "incorrect")
      onResult(mode)
    }
  }
  const message =
    mode === "correct" ? (
      <b className="text-2xl">Correct!</b>
    ) : mode === "incorrect" ? (
      <>
        <b className="text-lg">That&apos;s okay!</b>
        <br />
        You&apos;ll get better over time.
      </>
    ) : null

  return (
    <QuestionContainer>
      <QuestionHeader title={title} regeneratable={regeneratable} />
      {children}
      <SortableList
        items={items}
        onChange={setItems}
        className="p-5"
        disabled={mode === "correct" || mode === "incorrect"}
      />
      <QuestionFooter mode={mode} message={message} buttonClick={handleClick} />
    </QuestionContainer>
  )
}
