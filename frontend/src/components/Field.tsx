type FieldProps = {
    disabled: boolean,
    value?: string,
    onClick: () => void,
}

export default function Field({ disabled, value, onClick }: FieldProps) {
    return (
        <>
            <button
                type="button"
                disabled={disabled}
                className="field"
                onClick={onClick}
            >
                {value}
            </button>
        </>
    )
}