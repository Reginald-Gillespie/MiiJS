// No FS access in browser, so we'll mock that it's just all false
const {existsSync,promises,readFileSync,writeFileSync}={
    existsSync:()=>false,
    promises:{
        readFile:()=>null,
        writeFile:()=>null
    },
    readFileSync:()=>null,
    writeFileSync:()=>null
}
export {existsSync,promises,readFileSync,writeFileSync}
export default{existsSync,promises,readFileSync,writeFileSync}