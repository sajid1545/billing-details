import axios from "axios";

const apiRequestHandler = async (routePath, method, data = null, token = null) => {
	try {
		const axiosPublic = axios.create({
			baseURL: "http://localhost:5000/api/fox-funded/v1",
			// baseURL: `${import.meta.env.VITE_BASE_URL}/api/summit/v1`,
		});

		const url = `${axiosPublic.defaults.baseURL}${routePath}`;

		const config = {
			method,
			url,
			headers: {
				"Content-Type": "application/json",
				...(token && { Authorization: `Bearer ${token}` }),
			},
			...(data && { data: JSON.stringify(data) }),
		};

		const response = await axiosPublic(config);
		return response.data;
	} catch (error) {
		console.error("API call error:", error);
		throw error;
	}
};

export default apiRequestHandler;
