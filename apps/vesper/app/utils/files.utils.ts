export function generateFileUrl(file: File) {
    let fileSrc = URL.createObjectURL(file);
    setTimeout(() => {
        URL.revokeObjectURL(fileSrc);
    }, 1000);
    return fileSrc;
}

export function generateTempFileUrl(file: File) {
    let fileSrc = URL.createObjectURL(file);
    setTimeout(() => {
        URL.revokeObjectURL(fileSrc);
    }, 1000);
    return fileSrc;
}

export function revokeFileUrl(fileUrl: string) {
    URL.revokeObjectURL(fileUrl);
}