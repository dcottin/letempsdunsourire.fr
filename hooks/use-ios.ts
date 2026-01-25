import * as React from "react"

export function useIsIOS() {
    const [isIOS, setIsIOS] = React.useState(false)

    React.useEffect(() => {
        if (typeof window === "undefined") return

        const checkIOS = () => {
            // @ts-ignore - navigator.platform is deprecated but still useful for this
            const platform = navigator.userAgentData?.platform || navigator.platform || ""
            return (
                /iPad|iPhone|iPod/.test(navigator.userAgent) ||
                (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
            )
        }
        setIsIOS(checkIOS())
    }, [])

    return isIOS
}
