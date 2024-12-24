export function updateStateTable<K extends string | number | symbol, V>(
    setter: React.Dispatch<React.SetStateAction<Record<K, V>>>,
    key: K,
    newVal: V
) {
    setter(prevData => ({
        ...prevData,
        [key]: newVal
    }))
}

export function removeStateTableRow<K extends string | number | symbol, V>(
    setter: React.Dispatch<React.SetStateAction<Record<K, V>>>,
    key: K
) {
    setter(prevData => {
        const { [key]: removedRow, ...newVal } = prevData;
        return newVal as Record<K, V>;
    })
}