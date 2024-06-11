import dotenv from 'dotenv'; 

dotenv.config();

const awsData = {
    awsRegion: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESSKEY_ID,
    secretAccessKey: process.env.AWS_SEACRET_ACCESSKEY,
    cognitoClientId: process.env.COGNITO_CLIENT_ID,
    cognitoUserPoolId: process.env.COGNITO_USERPOOL_ID,
    dynamoEndpoint: process.env.DYNAMO_ENDPOINT,
};

//イベント情報のタイプ定義
interface Event {
    event_id: string; // UUIDを使用するため、stringに変更
    event_finished: number;
    event_coordinator_id: string;
    event_title: string;
    event_date: string;
    event_attendancedate: string;
    event_start_time: string;
    event_end_time: string;
    event_place: string;
    event_address: string;
    event_note: string;
}

type UserData = {
    user_id: string
    user_state: string
    user_nickname: string
    user_name: string
    user_note: string
}

export default awsData;
export type {
    Event,
    UserData,
};