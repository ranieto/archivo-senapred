import { createHash, createHmac } from 'node:crypto';

const REGION = 'us-east-1';
const IDENTITY_POOL = 'us-east-1:17c696bc-53e1-49a2-991f-f1b65f752fda';
const GRAPHQL_ENDPOINT = new URL(
	'https://rz2uv7ifxbgflh2bqmp6kmh4le.appsync-api.us-east-1.amazonaws.com/graphql'
);
const USER_AGENT = 'archivo-senapred/1.0';

type Credentials = { accessKeyId: string; secretKey: string; sessionToken: string };

async function cognito<T>(target: string, body: object): Promise<T> {
	const res = await fetch(`https://cognito-identity.${REGION}.amazonaws.com/`, {
		method: 'POST',
		headers: {
			'content-type': 'application/x-amz-json-1.1',
			'x-amz-target': `AWSCognitoIdentityService.${target}`,
			'user-agent': USER_AGENT
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(`Cognito ${target}: HTTP ${res.status} ${await res.text()}`);
	return (await res.json()) as T;
}

async function guestCredentials(): Promise<Credentials> {
	const { IdentityId } = await cognito<{ IdentityId: string }>('GetId', {
		IdentityPoolId: IDENTITY_POOL
	});
	const { Credentials: c } = await cognito<{
		Credentials: { AccessKeyId: string; SecretKey: string; SessionToken: string };
	}>('GetCredentialsForIdentity', { IdentityId });
	return { accessKeyId: c.AccessKeyId, secretKey: c.SecretKey, sessionToken: c.SessionToken };
}

const sha256 = (data: string) => createHash('sha256').update(data).digest('hex');
const hmac = (key: string | Buffer, data: string) => createHmac('sha256', key).update(data).digest();

function signedHeaders(creds: Credentials, body: string): Record<string, string> {
	const amzDate = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
	const day = amzDate.slice(0, 8);
	const scope = `${day}/${REGION}/appsync/aws4_request`;
	const canonicalHeaders =
		`host:${GRAPHQL_ENDPOINT.host}\n` +
		`x-amz-date:${amzDate}\n` +
		`x-amz-security-token:${creds.sessionToken}\n`;
	const signed = 'host;x-amz-date;x-amz-security-token';
	const canonicalRequest = [
		'POST',
		GRAPHQL_ENDPOINT.pathname,
		'',
		canonicalHeaders,
		signed,
		sha256(body)
	].join('\n');
	const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
	let key = hmac(`AWS4${creds.secretKey}`, day);
	for (const part of [REGION, 'appsync', 'aws4_request']) key = hmac(key, part);
	const signature = createHmac('sha256', key).update(stringToSign).digest('hex');
	return {
		'content-type': 'application/json',
		'user-agent': USER_AGENT,
		'x-amz-date': amzDate,
		'x-amz-security-token': creds.sessionToken,
		authorization: `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, SignedHeaders=${signed}, Signature=${signature}`
	};
}

export type GraphQL = <T>(query: string, variables: object) => Promise<T>;

export async function connect(): Promise<GraphQL> {
	const creds = await guestCredentials();
	return async <T>(query: string, variables: object): Promise<T> => {
		const body = JSON.stringify({ query, variables });
		for (let attempt = 1; ; attempt++) {
			const res = await fetch(GRAPHQL_ENDPOINT, {
				method: 'POST',
				headers: signedHeaders(creds, body),
				body
			});
			const json = (await res.json().catch(() => null)) as {
				data?: T;
				errors?: unknown[];
			} | null;
			if (res.ok && json?.data && !json.errors?.length) return json.data;
			if (attempt >= 3) {
				throw new Error(`AppSync HTTP ${res.status}: ${JSON.stringify(json?.errors ?? json)}`);
			}
			await new Promise((r) => setTimeout(r, 2000 * attempt));
		}
	};
}
