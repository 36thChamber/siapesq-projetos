export function maskCPF(value: string): string {
    return value
        .replace(/\D/g, "")              
        .substring(0, 11)
        .replace(/(\d{3})(\d)/, "$1.$2")  
        .replace(/(\d{3})(\d)/, "$1.$2")  
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskContato(value: string): string {
    return value
        .replace(/\D/g, "")
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .substring(0, 15); // limite
}
