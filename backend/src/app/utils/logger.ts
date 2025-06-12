import fs from "fs";
import path from "path";

function getCurrentDateTime() {
    return new Date().toISOString();
}

const logDir = path.join(process.cwd(), "logs");

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

export function logMessage(message: string) {
    let log = `${getCurrentDateTime()}: ${message}`;
    console.log(log);
    log += "\n";
    fs.appendFileSync(path.join(logDir, "server.log"), log);
}

export function errorMessage(message: string, error?: unknown) {
    let log = `${getCurrentDateTime()}: ${message}`;
    console.error(log);
    log += "\n";
    if (error) {
        console.error(error);
        log += error instanceof Error ? `\n${error.stack}` : `\n${error}`;
    }
    log += "\n";
    fs.appendFileSync(path.join(logDir, "error.log"), log);
}
