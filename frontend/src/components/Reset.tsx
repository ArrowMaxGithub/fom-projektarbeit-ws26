type ResetProps = {
    onReset: () => void,
}

export default function Reset({ onReset }: ResetProps) {
    return (
        <button
            type="button"
            className="reset"
            onClick={onReset}
        >
            Reset
        </button>
    )
}