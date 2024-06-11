import awsData from '../../src/config/config';
import { NextApiRequest, NextApiResponse } from 'next';
import {
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';


const client = new CognitoIdentityProviderClient({ region: awsData.awsRegion });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//アクセスメソッドが'POST'になっているかの確認
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    } else
//パスワード変更のリクエストをCognitoに送る________________________________________________________________________________
    if (req.body['key01'] == 'REQUESTCHANGEPASS') {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        try {
            const command = new ForgotPasswordCommand({
                ClientId: awsData.cognitoClientId,
                Username: email,
            });

            await client.send(command);

            res.status(200).json({ message: 'Password reset code sent' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to send password reset code', error: error.message });
        }
    } else
//パスワードを変更する________________________________________________________________________________
    if (req.body['key01'] == 'CHANGEPASS') {
        const { email, code, newPassword } = req.body;

        if (!email || !code || !newPassword) {
            return res.status(400).json({ message: 'Missing parameters' });
        }

        try {
            const command = new ConfirmForgotPasswordCommand({
                ClientId: awsData.cognitoClientId!,
                Username: email,
                ConfirmationCode: code,
                Password: newPassword,
            });

            await client.send(command);

            res.status(200).json({ message: 'Password has been reset successfully' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to reset password', error: error.message });
        }
    }
};