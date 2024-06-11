import awsData from '../../src/config/config';
import jwt from 'jsonwebtoken';
import { 
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
    AuthFlowType,
    RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";


const client = new CognitoIdentityProviderClient({ region: awsData.awsRegion });

export default async function handler(req, res) {
    if (req.method == 'POST') {
//ログイン処理________________________________________________________________________________
        if (req.body['key01'] == 'LOGIN') {
            const { username, password } = req.body;

            const params = {
                AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
                AuthParameters: {
                    USERNAME: username,
                    PASSWORD: password,
                    
                },
                UserPoolId: awsData.cognitoUserPoolId,
                ClientId: awsData.cognitoClientId,
            };

console.log(params);

            try {
                const command = new InitiateAuthCommand(params);
                // console.log(command);
                const response = await client.send(command);
                
                if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                    const userAttributes = JSON.parse(response.ChallengeParameters?.userAttributes || '{}');
                    res.status(200).json({
                        ChallengeName: response.ChallengeName,
                        UserName: userAttributes.email,
                        Session: response.Session,
                        ChallengeParameters: response.ChallengeParameters,
                    });
                } else {
                    const idToken = response.AuthenticationResult?.IdToken;
                    const accessToken = response.AuthenticationResult?.AccessToken;
                    const refreshToken = response.AuthenticationResult?.RefreshToken;
                    if(idToken){
                        // const decodedIdToken = jwt.decode(idToken);
                        // const decodedAccessToken = jwt.decode(accessToken);
console.log('successful login\nREFRESHTOKEN:  ', refreshToken, '\n\nIDTOKEN:  ', idToken, '\n\nACCESSTOKEN:  ', accessToken);
                        res.status(200).json({
                            massage: 'Authentication successful',
                            idtoken: idToken,
                            accesstoken: accessToken,
                            refreshtoken: refreshToken,
                        });
                    } else {
                        res.status(400).json({ message: 'Authentication failed' });
                    }
                }
            } catch (error) {
                console.log(error);
                res.status(400).json({ error: 'Authentication failed' });
            }
        } else 
//パスワードアップデート部分（初回ログイン時）________________________________________________________________________________
        if (req.body['key01'] == 'UPDATEPASS') {
            const { username, newPassword, session } = req.body;

            try {
                const command = new RespondToAuthChallengeCommand({
                    ChallengeName: 'NEW_PASSWORD_REQUIRED',
                    ClientId: awsData.cognitoClientId,
                    ChallengeResponses: {
                        USERNAME: username,
                        NEW_PASSWORD: newPassword,
                    },
                    Session: session,
                });
          
                const response = await client.send(command);

                const idToken = response.AuthenticationResult?.IdToken;
                const accessToken = response.AuthenticationResult?.AccessToken;
                const refreshToken = response.AuthenticationResult?.RefreshToken;

console.log(idToken);
        
                if (idToken) {
                    res.status(200).json({
                        message: 'Password changed successfully',
                        idtoken: idToken,
                        accesstoken: accessToken,
                        refreshtoken: refreshToken,
                    });
                } else {
                    res.status(400).json({ message: 'Authentication failed' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({ error: 'Failed to set new password' });
            }
    }
    }
}
