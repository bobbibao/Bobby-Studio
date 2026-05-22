import axios from 'axios';
// import { VITE_API_URL } from '../config';
// import localStorageKey from '@/types/localStorageKey';
import { VITE_API_URL } from '../config';
import localStorageKey from '../constants/localStorage';


const promptService = axios.create({
	headers: {
    // 'Content-Type': 'gen/api',
    'Accept': '*/*'
	},
	baseURL: VITE_API_URL,
});

promptService.interceptors.request.use(
	(config) => {
		// const state: IStoreState = store.getState();
		const sessions = localStorage.getItem(localStorageKey.credential);
		const token = JSON.parse(sessions || '{}').access_token;

		if (config.headers) {
			config.headers['Authorization'] = config.headers['Authorization'] || `Bearer ${token}`;
            if (!(config.data instanceof FormData)) {
                config.headers = {
                    ...config.headers,
                } as any;
        
            }
		}

		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (token) {
            prom.resolve(token);
        } else {
            prom.reject(error);
        }
    });
    failedQueue = [];
};


promptService.interceptors.response.use(
    (response) => response,
    async (error) => {

        const originalRequest = error.config;

        // Check if the error status is 401 and prevent retry loops
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers['Authorization'] = `Bearer ${token}`;
                        return promptService(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const sessions = localStorage.getItem(localStorageKey.credential);
            const refreshToken = JSON.parse(sessions || '{}').refresh_token;

            return new Promise((resolve, reject) => {
                axios
                    .post(`${VITE_API_URL}/oauth/token`, {
                        token: refreshToken,
                        grant_type: 'refresh_token',
                    })
                    .then(async ({ data }) => {

                        // Store the new token
                        localStorage.setItem(localStorageKey.credential, JSON.stringify(data));
                        promptService.defaults.headers['Authorization'] = `Bearer ${data.access_token}`;
                        originalRequest.headers['Authorization'] = `Bearer ${data.access_token}`;
                        originalRequest.headers['Content-Type'] = `gen/api`;
						promptService.defaults.headers['Content-Type'] = `gen/api`;

                        // try {
                        //     const profileResponse = await axiosInstance.post('/app/login', {});
                        //     localStorage.setItem(localStorageKey.credential, JSON.stringify(profileResponse.data));
                        // } catch (profileError) {
                        //     console.error('Failed to fetch user profile:', profileError);
                        // }

                        processQueue(null, data.access_token);
                        resolve(promptService(originalRequest));

                        //Temporary ignore above flow untile complete above logic.
                        window.location.href = '/account/login';

                    })
                    .catch((err) => {
                        processQueue(err, null);
                        reject(err);
                    })
                    .finally(() => {
                        isRefreshing = false;
                    });
            });
        }

        return Promise.reject(error);
    }
);



export default promptService;

