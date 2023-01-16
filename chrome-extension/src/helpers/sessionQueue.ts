import config from "../config";
import { RecordingType } from "./recording";

export type SessionType = {
    uuid: string;
    metadata: {
        tabId: number;
        startTs: number;
        endTs: number;
        descriptionUser: string | null;
        inferredTitle?: string;
    };
};

export function queueSessionForReview(
    session: SessionType,
    recording: RecordingType
): Promise<void> {
    return new Promise((resolve, reject) => {
        getQueue("sessionQueue").then((queue: SessionType[]) => {
            const sessionQueue = queue.slice(-config.maxSessionQueueSize);
            sessionQueue.push(session);
            saveQueue("sessionQueue", sessionQueue).then(resolve).catch(reject);
        });
        getQueue("recordingQueue").then((queue: RecordingType[]) => {
            const recordingQueue = queue.slice(-config.maxSessionQueueSize);
            recordingQueue.push(recording);
            saveQueue("recordingQueue", recordingQueue).then(resolve).catch(reject);
        });
    });
}
export function getQueue(key: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
            if (chrome.runtime.lastError)
                return reject(chrome.runtime.lastError);

            resolve(JSON.parse(result[key] || "[]"));
        });
    });
}
export function saveQueue(key: string, value: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: JSON.stringify(value) }, function () {
            if (chrome.runtime.lastError)
                return reject(chrome.runtime.lastError);
            resolve();
        });
    });
}
export function deleteSessionByUuid(uuid: string): Promise<void> {
    return new Promise((resolve, reject) => {
        getQueue("sessionQueue").then((queue: SessionType[]) => {
            const sessionQueue = queue.filter(
                (session) => session.uuid !== uuid
            );
            const foundAndDeleted = sessionQueue.length === queue.length - 1;
            if (!foundAndDeleted)
                return reject(
                    new Error(
                        `Could not find session with uuid ${uuid} in session queue`
                    )
                );
            saveQueue("sessionQueue", sessionQueue).then(resolve).catch(reject);
        }).catch(() => null); // TODO: sentry
        getQueue("recordingQueue").then((queue: RecordingType[]) => {
            const recordingQueue = queue.filter(
                (recording) => recording.uuid !== uuid
            );
            const foundAndDeleted = recordingQueue.length === queue.length - 1;
            if (!foundAndDeleted)
                return reject(
                    new Error(
                        `Could not find session with uuid ${uuid} in recording queue`
                    )
                );
            saveQueue("recordingQueue", recordingQueue)
                .then(resolve)
                .catch(reject);
        }).catch(() => null); // TODO: sentry
    });
}
