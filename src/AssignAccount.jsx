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

const challenge = sc5k;

const selectedChallengeName = challenge?.challengeName;

const AssignCredentials = () => {
	const [loading, setLoading] = useState(false);

	// User info array
	// Todo: Update with actual user data, create an array of objects with user info
	const userInfos = [
		{
			Email: "ask.bersekutu@gmail.com",
			Password: "H%k1RuEZ",
			Account: 432153,
		},
		{
			Email: "test@gmail.com",
			Password: "H%k1RuEZ",
			Account: 413624,
		},
	];

	const handleCreateUser = async () => {
		setLoading(true);

		try {
			for (const userDetails of userInfos) {
				const orderId = generateRandomHexId();

				// Define user data
				const user = {
					email: userDetails?.Email,
				};

				// Create user
				const createUserResponse = await apiRequestHandler(
					"/users/normal-register",
					"POST",
					user,
				);

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
					},
				);

				// Check if updating user purchase products was successful
				if (!updateUserPurchaseProducts) {
					toast.error("Failed to update user purchased products.");
					return;
				}

				const productId =
					updateUserPurchaseProducts.data.purchasedProducts[orderId].productId;

				const product =
					updateUserPurchaseProducts.data.purchasedProducts[orderId].product;

				const challengeStage =
					product?.challengeType === "funded" ? "funded" : "phase1";
				const challengeStageData = {
					...product,
					challengeStages: {
						...product.challengeStages,
						phase1:
							challengeStage === "funded"
								? null
								: product.challengeStages.phase1,
						phase2:
							challengeStage === "funded" || challengeStage === "phase1"
								? null
								: product.challengeStages.phase2,
						funded:
							challengeStage === "phase1"
								? null
								: product.challengeStages.funded,
					},
				};

				const mt5SignUpData = {
					account: userDetails.Account,
					email: createUserResponse.email,
					masterPass: createUserResponse.password,
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
					},
				);

				// Check if MT5 account update was successful
				if (!updateMT5Account) {
					toast.error("Failed to update user MT5 account.");
					return;
				}

				// Update the user's role to trader
				await apiRequestHandler(`/users/${createUserResponse._id}`, "PUT", {
					role: "trader",
				});

				toast.success("MT5 account created successfully.");
			}
		} catch (error) {
			toast.error("An unexpected error occurred.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="max-w-[1440px] mx-auto h-screen">
			<div className="flex justify-center items-center h-full flex-col">
				<h1 className="text-5xl font-bold">
					Challenge Selected : {selectedChallengeName || ""}
				</h1>
				<button
					onClick={handleCreateUser}
					type="button"
					className="bg-blue-600 px-6 py-4 text-white rounded-md my-10"
					disabled={loading}
				>
					{loading ? "Processing..." : "Create MT5 in Database"}
				</button>
			</div>
		</section>
	);
};

export default AssignCredentials;
