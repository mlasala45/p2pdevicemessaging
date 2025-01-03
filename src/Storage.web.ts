function getCompositeKey(params: { key: string; id?: string }): string {
    return params.id ? `${params.key}/${params.id}` : params.key
}

function splitCompositeKey(compositeKey: string) {
    return compositeKey.split('/')
}

const storage = {
    load: function (params: { key: string; id?: string }): Promise<any> {
        console.log(`Web storage load storage/${params.key}`)
        return new Promise((resolve, reject) => {
            const val = localStorage.getItem(getCompositeKey(params))
            if (val) {
                console.dir(val)
                resolve(JSON.parse(val))
            }
            else {
                reject({
                    name: "NotFoundError"
                })
            }
        })
    },
    save: function (params: { key: string; id?: string; data: any }) {
        const compositeKey = getCompositeKey(params)
        if (typeof params.data == 'function') throw new Error(`Function was passed to storage.save: storage/${compositeKey}`)
        localStorage.setItem(compositeKey, JSON.stringify(params.data))
    },
    remove: function (params: { key: string; id?: string }) {
        localStorage.removeItem(getCompositeKey(params))
    },
    getIdsForKey: function(key: string) {
        console.log(`Web storage getIdsForKey storage/${key}`)
        return new Promise((resolve, reject) => {
            const len = localStorage.length
            const ret = []
            for (let i = 0; i < len; i++) {
                const compositeKey = localStorage.key(i)
                if (compositeKey) {
                    const [sampleKey, sampleId] = splitCompositeKey(compositeKey)
                    if (sampleKey == key && sampleId) {
                        ret.push(sampleId)
                    }
                }
            }
            resolve(ret)
        })
    },
    getAllDataForKey: function (key: string) {
        console.log(`Web storage getAllDataForKey storage/${key}`)
        return new Promise((resolve, reject) => {
            const len = localStorage.length
            const ret = []
            for (let i = 0; i < len; i++) {
                const compositeKey = localStorage.key(i)
                console.log(i,compositeKey)
                if (compositeKey) {
                    const [sampleKey] = splitCompositeKey(compositeKey)
                    console.log(`sampleKey`,sampleKey)
                    if (sampleKey == key) {
                        console.log("Match")
                        const data = localStorage.getItem(key)
                        console.dir(data)
                        if (data) ret.push(JSON.parse(data))
                    }
                }
            }
            resolve(ret)
        })
    },
    clearMapForKey: function (key: string) {
        console.log(`Web storage clearMapForKey storage/${key}`)
        const len = localStorage.length
        const keysToRemove = []
        for (let i = 0; i < len; i++) {
            const compositeKey = localStorage.key(i)
            if (compositeKey) {
                const [sampleKey] = splitCompositeKey(compositeKey)
                console.log(i,compositeKey,sampleKey)
                if (sampleKey == key) {
                    keysToRemove.push(compositeKey)
                }
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
    }
}

export default storage;