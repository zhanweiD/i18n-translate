/*
 * @Description: 这是i18n翻译页面（组件）
 * @Date: 2020-08-18 21:36:31
 * @Author: zouzheng
 * @LastEditors: zhanwei
 * @LastEditTime: 2022-08-10 16:20:16
 */
const path = require('path')
const fs = require('fs')
const axios = require('axios')

// node执行路径
const dirPath = process.cwd()

// 语言json文件key
const langKey = []

const language = {
    en: 'ZH_CN2EN', //英语
    ja: 'ZH_CN2JA', //日语
    kr: 'ZH_CN2KR', //韩语
    fr: 'ZH_CN2FR', //法语
    ru: 'ZH_CN2RU', //俄语
    sp: 'ZH_CN2SP', //西语
}

/**
 * @description: 文件夹遍历
 * @param {content} content/文件夹路径
 * @return {type}
 */
const fileTra = (content) => {
    //根据文件路径读取文件，返回文件列表
    return new Promise((resolve, reject) => {
        fs.readdir(content, async function (err, files) {
            if (err) {
                console.warn(err)
                reject(err)
            } else {
                //遍历读取到的文件列表
                for (let i = 0; i < files.length; i++) {
                    //获取当前文件的绝对路径
                    const filedir = path.join(content, files[i])
                    //根据文件路径获取文件信息
                    const isFile = await fileRead(filedir)
                    // 如果是文件夹，递归遍历该文件夹下面的文件
                    if (!isFile) {
                        await fileTra(filedir)
                    } else {
                        // 读取文件
                        const fileContent = fs.readFileSync(filedir, 'utf-8')
                        // 提取i18n语言文字
                        const lang = getTranslateKey(fileContent)
                        lang.forEach((item) => {
                            if (langKey.indexOf(item) === -1 || item === '') {
                                langKey.push(item)
                            }
                        })
                    }
                }
                resolve(files)
            }
        })
    })
}

/**
 * @description: 匹配t('')或t("")里的内容
 * @param {type}
 * @return {type}
 */
const getTranslateKey = (source) => {
    let result = []
    // const reg = /(\$|\.)t\((\'|\")([^\)\'\"]+)(\'|\")(,([^\)\'\"]+))?\)/gm
    const reg = /(t\((\'|\"))([\u4e00-\u9fa5_a-zA-Z0-9]*)((\'|\")\))/gm
    let matchKey
    while ((matchKey = reg.exec(source))) {
        result.push(matchKey[3])
    }
    return result
}

/**
 * @description: 判断是文件还是文件夹
 * @param {String} filedir/文件路径
 * @return {type}
 */
const fileRead = (filedir) => {
    return new Promise((resolve, reject) => {
        fs.stat(filedir, function (err, stats) {
            if (err) {
                console.warn('获取文件stats失败')
                reject(err)
            } else {
                //文件
                const isFile = stats.isFile()
                // 文件夹
                const isDir = stats.isDirectory()
                if (isFile) {
                    resolve(true)
                }
                if (isDir) {
                    resolve(false)
                }
            }
        })
    })
}

/**
 * @description: 翻译接口
 * @param {String} zh/翻译文本
 * @param {String} lang/翻译语种
 * @param {String} i/请求次数，超过三次不再请求
 * @return {type}
 */
const translate = (zh, lang, i = 0) => {
    return new Promise((resolve, reject) => {
        axios
            .get('http://fanyi.youdao.com/translate', {
                params: {
                    doctype: 'json',
                    type: language[lang] || language['en'],
                    i: zh,
                },
            })
            .then(async (res) => {
                resolve(res.data.translateResult[0][0].tgt)
            })
            .catch((err) => {
                reject(err)
            })
    })
}

/**
 * @description: 语言抽离并写入中文json文件
 * @param {String} p/需翻译的目录路径
 * @param {String} l/需写入的中文json文件路径
 * @return {type}
 */
const pikazI18nLang = async (p, l) => {
    // 抽离语言
    const tPath = path.join(dirPath, p)
    await fileTra(tPath)
    // 写入语言文件
    const lPath = path.join(dirPath, l)
    let zh = fs.readFileSync(lPath, 'utf-8')
    return new Promise((resolve, reject) => {
        zh = zh ? JSON.parse(zh) : {}
        langKey.forEach((key) => {
            if (Object.keys(zh).indexOf(key) === -1) {
                zh[key] = key
            }
        })
        const err = fs.writeFileSync(lPath, JSON.stringify(zh), 'utf8')
        if (err) {
            reject(err)
        }
        resolve()
    })
}

/**
 * @description: 将中文json文件翻译写入英文json文件
 * @param {String} zh/中文语言文件路径
 * @param {String} en/英文语言文件路径
 * @param {String} lang/语言种类，默认英文
 * @return {type}
 */
const pikazI18nTranslate = (zh, en, lang = 'en') => {
    const zhPath = path.join(dirPath, zh)
    let zhJson = fs.readFileSync(zhPath, 'utf-8')
    zhJson = zhJson ? JSON.parse(zhJson) : {}
    const enPath = path.join(dirPath, en)
    let enJson = fs.readFileSync(enPath, 'utf-8')
    enJson = enJson ? JSON.parse(enJson) : {}
    const key = []
    Object.keys(zhJson).forEach((k) => {
        if (Object.keys(enJson).indexOf(k) === -1) {
            key.push(k)
        }
    })
    for (let i = 0; i < key.length; i++) {
        const e = await translate(key[i], lang)
        enJson[key[i]] = e
        // enJson[key[i]] = key[i]
    }
    return new Promise((resolve, reject) => {
        const err = fs.writeFileSync(enPath, JSON.stringify(enJson), 'utf8')
        if (err) {
            reject(err)
        }
        resolve()
    })
}

module.exports = { pikazI18nLang, pikazI18nTranslate }
