import { useState, useRef, useEffect } from "react"
import { ShieldAlert, Minus, KeyRound, CheckCircle2 } from "lucide-react"
import { desktop } from "../desktop/bridge"
import { useTranslation } from "../utils/i18n"

function formatLockout(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export default function LockScreen({
  onUnlocked,
}: {
  onUnlocked?: () => void
}) {
  const { t } = useTranslation()
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus first input on mount
    const timer = setTimeout(() => {
      inputsRef.current[0]?.focus()
    }, 150)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let active = true
    const checkStatus = () => {
      desktop()
        ?.getLockStatus?.()
        .then((st) => {
          if (active && typeof st?.lockoutRemainingSeconds === "number") {
            setLockoutRemaining(st.lockoutRemainingSeconds)
          }
        })
        .catch(() => {})
    }
    checkStatus()
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move back and clear previous
        const next = [...digits]
        next[index - 1] = ""
        setDigits(next)
        inputsRef.current[index - 1]?.focus()
      } else {
        const next = [...digits]
        next[index] = ""
        setDigits(next)
      }
      setError(null)
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleChange = (index: number, value: string) => {
    // Only allow single digit 0-9
    const char = value.replace(/\D/g, "").slice(-1)
    if (!char) return

    const next = [...digits]
    next[index] = char
    setDigits(next)
    setError(null)

    // Auto advance
    if (index < 5) {
      inputsRef.current[index + 1]?.focus()
    }

    // Auto submit if all 6 digits entered
    if (next.every((d) => d !== "")) {
      void verifyCode(next.join(""))
    }
  }

  const verifyCode = async (code: string) => {
    if (code.length !== 6 || loading || lockoutRemaining > 0) return
    setLoading(true)
    setError(null)

    try {
      const res = await desktop()?.verifyTotp?.(code)
      if (res?.success) {
        setSuccess(true)
        setTimeout(() => {
          onUnlocked?.()
        }, 600)
      } else {
        if (res?.lockoutRemainingSeconds && res.lockoutRemainingSeconds > 0) {
          setLockoutRemaining(res.lockoutRemainingSeconds)
          setError(null)
        } else if (
          typeof res?.failedAttempts === "number" &&
          res.failedAttempts > 0
        ) {
          const attemptsLeft = Math.max(0, 5 - res.failedAttempts)
          setError(t("invalidOtpWithAttempts", { remaining: attemptsLeft }))
        } else {
          setError(t("invalidOtp"))
        }
        setDigits(["", "", "", "", "", ""])
        inputsRef.current[0]?.focus()
      }
    } catch {
      setError(t("invalidOtp"))
      setDigits(["", "", "", "", "", ""])
      inputsRef.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = digits.join("")
    void verifyCode(code)
  }

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between p-6 select-none bg-panel text-foreground">
      {/* Top action: collapse panel */}
      <div className="flex w-full justify-end">
        <button
          type="button"
          onClick={() => desktop()?.collapsePanel()}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/60 transition-all hover:bg-muted hover:text-foreground active:scale-95 cursor-pointer"
          title="Thu nhỏ"
        >
          <Minus size={16} />
        </button>
      </div>

      {/* Main Lock Card */}
      <div className="flex w-full max-w-[300px] flex-col items-center text-center">
        <div className="relative mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-danger/10 text-danger shadow-inner">
          {success ? (
            <CheckCircle2
              size={34}
              className="text-emerald-500 animate-scale-in"
            />
          ) : (
            <ShieldAlert size={34} />
          )}
        </div>

        <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
          {t("timeLimitReached")}
        </h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {t("timeLimitDesc")}
        </p>

        {/* 6-digit input form */}
        <form onSubmit={handleSubmit} className="mt-7 w-full">
          <div className="mb-2 text-[12px] font-medium text-muted-foreground">
            {t("enterAdminOtp")}
          </div>

          <div
            className={`flex justify-between gap-2 ${
              error ? "animate-shake" : ""
            }`}
          >
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                disabled={loading || success || lockoutRemaining > 0}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`h-13 w-12 rounded-xl border-2 text-center font-mono text-[20px] font-bold transition-all duration-200 outline-none ${
                  lockoutRemaining > 0
                    ? "border-danger/30 bg-muted/20 text-muted-foreground opacity-60 cursor-not-allowed"
                    : error
                      ? "border-danger/80 bg-danger/5 text-danger"
                      : success
                        ? "border-emerald-500/80 bg-emerald-500/5 text-emerald-500"
                        : digit
                          ? "border-primary/80 bg-card text-foreground shadow-sm"
                          : "border-border/80 bg-muted/30 text-foreground focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20"
                }`}
              />
            ))}
          </div>

          {lockoutRemaining > 0 ? (
            <div className="mt-2.5 rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-2 text-[11px] font-medium text-danger animate-in fade-in leading-relaxed">
              {t("temporarilyLocked", {
                time: formatLockout(lockoutRemaining),
              })}
            </div>
          ) : error ? (
            <div className="mt-2.5 text-[11px] font-medium text-danger animate-in fade-in">
              {error}
            </div>
          ) : null}

          {success && (
            <div className="mt-2.5 text-[11px] font-medium text-emerald-500 animate-in fade-in">
              {t("unlockSuccess")}
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              success ||
              lockoutRemaining > 0 ||
              digits.some((d) => d === "")
            }
            className="mt-7 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <KeyRound size={16} />
            <span>{loading ? t("unlocking") : t("unlock")}</span>
          </button>
        </form>
      </div>

      <div className="text-[10px] text-muted-foreground/60">
        Bubble Chat • Protected by TOTP RFC 6238
      </div>
    </div>
  )
}
