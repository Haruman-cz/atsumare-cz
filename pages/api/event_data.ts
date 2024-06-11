import type { NextApiRequest, NextApiResponse } from 'next'
import { Event } from '../../src/config/config';
import { 
    getEventFromDynamoDB,
    addEventToDynamoDB,
    updateEventInDynamoDB 
} from '../../src/accessAWS/accessdynamo';


const TABLE_NAME = 'events';

let events: Event[] = [];


async function updateEvent(parsedData: any) {
    const newevent: Event = {
        event_id: parsedData.event_id,
        event_finished: Number(parsedData.event_finished),
        event_coordinator_id: parsedData.event_coordinator_id,
        event_title: parsedData.event_title,
        event_date: parsedData.event_date,
        event_attendancedate: parsedData.event_attendancedate,
        event_start_time: parsedData.event_start_time,
        event_end_time: parsedData.event_end_time,
        event_place: parsedData.event_place,
        event_address: parsedData.event_address,
        event_note: parsedData.event_note,
    };

// console.log(newevent);

console.log('今回のイベントのIDは！:', newevent.event_id);
    if (newevent.event_id == 'NEWEVENT') {
        console.log('新しく設定されたイベントです。');
        console.log(newevent);

        // イベントを保存
        await addEventToDynamoDB(TABLE_NAME, newevent, newevent.event_coordinator_id)
        .then((res) => {
            if (res) {
                console.log("Item set successfully!");
                return newevent;
            } else 
            if (res == null) {
                console.log('Error');
                return null;
            }
        })
        .catch((error) => {
            console.error("Error updating item:", error);
        });

        return newevent;
    } else {
console.log('既存のイベントですね');
        //既存のイベントならイベントの上書き
        const partitionKey =    newevent.event_id;

        // データを更新する関数を呼び出す
        await updateEventInDynamoDB(TABLE_NAME, partitionKey, newevent)
        .then((res) => {
            if (res == 0) {
                console.log("Item updated successfully!");
                return newevent;
            } else 
            if (res == 1) {
                console.log('Error');
                return null;
            }
        })
        .catch((error) => {
            console.error("Error updating item:", error);
        });
        // console.log('ここにいます', index);
    }
}


async function handler(req: NextApiRequest, res: NextApiResponse){
    if (req.method == 'GET') {
        getEventFromDynamoDB(TABLE_NAME)
        .then((data) => {
// console.log(data);
            events = data;
            res.status(200).json(events);
        })
        .catch((error) => {
console.error("Error fetching data from DynamoDB:", error);
        });
    } else
    if (req.method == 'POST') {
        if (req.body['key01'] == 'ADDEVENT'){
            const parsedData = JSON.parse(req.body['data']);
            console.log('これがリクエストされたデータです。',parsedData);

            //イベント追加・編集を行う関数へ
            const newEvent: Event = await updateEvent(parsedData);
    // console.log(events);

            

            if (newEvent) {
                res.status(200).json(newEvent);
            } else {
                res.status(500).json('できてませんわ');
            }
        } else 
        if (req.body['key01'] == 'EDITEVENT') {
            const parsedData = req.body['data'];

            console.log('これがリクエストされたデータです。',parsedData);

            //イベント追加・編集を行う関数へ
            const newEvent: Event = await updateEvent(parsedData);
    // console.log(events);

            if (newEvent) {
                res.status(200).json(newEvent);
            } else {
                res.status(500).json('できてませんわ');
            }
        } else {
            //
        }
    }
}

export default handler