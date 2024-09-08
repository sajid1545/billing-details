/* eslint-disable no-unused-vars */
import { useState } from "react";
import toast from "react-hot-toast";
import { sc5k } from "./constants/challengeDatas";
import apiRequestHandler from "./utils/apiRequestHandler";

function generateRandomHexId() {
	// Generate a random number between 0 and 0xFFFFFF (16777215 in decimal)
	const randomColor = Math.floor(Math.random() * 16777215);

	// Convert the number to a hexadecimal string and pad it with leading zeros if needed
	const hexColor = randomColor.toString(16).padStart(6, "0");

	// Return the hex color string with a '#' prefix
	return `#${hexColor}`;
}

const generatePassword = () => {
	const capitalLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const smallLetters = "abcdefghijklmnopqrstuvwxyz";
	const numbers = "0123456789";
	const specialCharacters = "!@#$%^&*()_+[]{}|;:,.<>?";

	// Ensure at least one of each required type
	let password = "";
	password += capitalLetters[Math.floor(Math.random() * capitalLetters.length)];
	password += smallLetters[Math.floor(Math.random() * smallLetters.length)];
	password += numbers[Math.floor(Math.random() * numbers.length)];
	password += specialCharacters[Math.floor(Math.random() * specialCharacters.length)];

	// Fill the rest of the password length with a mix of all types
	const allCharacters = capitalLetters + smallLetters + numbers + specialCharacters;

	for (let i = password.length; i < 8; i++) {
		// Introduce a time-based factor to ensure uniqueness
		const uniqueIndex =
			Math.floor(Math.random() * allCharacters.length) + (Date.now() % allCharacters.length);
		password += allCharacters[uniqueIndex % allCharacters.length];
	}

	// Shuffle the password to ensure randomness
	password = password
		.split("")
		.sort(() => Math.random() - 0.5)
		.join("");

	return password;
};

const challenge = sc5k;

const selectedChallengeName = challenge?.challengeName;

const AssignCredentials = () => {
	const [loading, setLoading] = useState(false);

	// User info array
	// Todo: Update with actual user data, create an array of objects with user info
	const userInfos = [
		{
			Email: "clashking1545@gmail.com",
			Account: Math.floor(100000 + Math.random() * 900000),
		},
		// {
		// 	Email: "rasibul179@gmail.com",
		// 	Account: Math.floor(100000 + Math.random() * 900000),
		// },
		// {
		// 	Email: "zentexx2023@gmail.com",
		// 	Account: Math.floor(100000 + Math.random() * 900000),
		// },
	];

	const handleCreateUser = async () => {
		setLoading(true);
		const failedEmailAttempts = []; // Array to store failed email attempts

		try {
			for (const userDetails of userInfos) {
				const orderId = generateRandomHexId();

				// Define user data
				const user = {
					email: userDetails?.Email,
				};

				// Create user
				const createUserResponse = await apiRequestHandler("/users/normal-register", "POST", user);

				if (!createUserResponse) {
					toast.error("Failed to create user");
					setLoading(false);
					return;
				}

				// Update user purchase products after order is placed
				const updateUserPurchaseProducts = await apiRequestHandler(
					`/users/${createUserResponse._id}/purchased-products`,
					"PUT",
					{
						productId: orderId,
						product: challenge, // TODO: Update with actual challenge data
					}
				);

				if (!updateUserPurchaseProducts) {
					toast.error("Failed to update user purchased products.");
					return;
				}

				const productId = updateUserPurchaseProducts.data.purchasedProducts[orderId].productId;
				const product = updateUserPurchaseProducts.data.purchasedProducts[orderId].product;

				const challengeStage = product?.challengeType === "funded" ? "funded" : "phase1";
				const challengeStageData = {
					...product,
					challengeStages: {
						...product.challengeStages,
						phase1: challengeStage === "funded" ? null : product.challengeStages.phase1,
						phase2:
							challengeStage === "funded" || challengeStage === "phase1"
								? null
								: product.challengeStages.phase2,
						funded: challengeStage === "phase1" ? null : product.challengeStages.funded,
					},
				};

				const mt5SignUpData = {
					account: userDetails.Account,
					email: createUserResponse.email,
					masterPassword: generatePassword(),
					leverage: 30,
					group: "demo\\ecn-demo-1", // TODO: Update with actual MT5 group
					productId,
					challengeStage: challengeStage,
					challengeStageData,
				};

				// Inject MT5 account data in user's collection
				const updateMT5Account = await apiRequestHandler(
					`/users/${createUserResponse._id}`,
					"PUT",
					{
						mt5Accounts: [mt5SignUpData],
					}
				);

				if (!updateMT5Account) {
					toast.error("Failed to update user MT5 account.");
					return;
				}

				toast.success(
					`MT5 account created successfully for user ${createUserResponse.email}. Account: ${mt5SignUpData.account}`
				);

				// Update the user's role to trader
				await apiRequestHandler(`/users/${createUserResponse._id}`, "PUT", {
					role: "trader",
				});

				const emailObjects = {
					email: userDetails.Email,
					account: userDetails.Account,
					masterPassword: mt5SignUpData.masterPassword,
					password: updateMT5Account.password,
				};
				console.log("🚀 ~ handleCreateUser ~ emailObjects:", emailObjects);
				try {
					const sendEmail = await apiRequestHandler(
						"/users/credentials",
						"POST",
						emailObjects,
						null
					);
					if (!sendEmail) {
						throw new Error("Failed to send email");
					}

					toast.success(
						`MT5 account created and email sent successfully for account: ${mt5SignUpData.account}`
					);
				} catch (emailError) {
					toast.error("Failed to send email. Data has been saved for review.");
					// Save failed email details for later review
					failedEmailAttempts.push(emailObjects);
				}
			}
		} catch (error) {
			toast.error("An unexpected error occurred.");
		} finally {
			setLoading(false);
			if (failedEmailAttempts.length > 0) {
				console.log("Failed email attempts:", failedEmailAttempts);
				// Optionally, you can store it in a state for UI display
			}
		}
	};

	return (
		<section className="max-w-[1440px] mx-auto h-screen">
			<div className="flex justify-center items-center h-full flex-col">
				<h1 className="text-5xl font-bold">Challenge Selected : {selectedChallengeName || ""}</h1>
				<button
					onClick={handleCreateUser}
					type="button"
					className="bg-blue-600 px-6 py-4 text-white rounded-md my-10"
					disabled={loading}>
					{loading ? "Processing..." : "Create MT5 in Database"}
				</button>
			</div>
		</section>
	);
};

export default AssignCredentials;
