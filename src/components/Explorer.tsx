import React, { useState } from "react";
import { ProcessedFeaturesType } from "../types";
import {
	BORDER_RADIUS,
	CONTAINER_WIDTH,
	// FONT_SIZE,
	// PADDING,
	getActivations,
} from "../utils";
import categories from "../data/categorized_dataset_new.json";
import { LoadingIcon } from "./Icons";

const Category = ({
	categories,
	getFeatureActivations,
}: {
	categories: any;
	getFeatureActivations: (
		features: number[],
		categoryKey?: string | null
	) => void;
}) => {
	const [selectedCategory, setSelectedCategory] = useState("");
	const [members, setMembers] = useState<{ index: number; label: string }[]>(
		[]
	);
	const [page, setPage] = useState(0);
	const itemsPerPage = 15;

	const getTotalCount = (categoryData: any): number => {
		if (!categoryData || typeof categoryData !== "object") return 0;

		let count = 0;

		if (Array.isArray(categoryData.members)) {
			count += categoryData.members.length;
		}

		Object.entries(categoryData)
			.filter(([key, _]: [string, any]) => key !== "members")
			.forEach(([_, value]: [string, any]) => {
				count += getTotalCount(value);
			});

		return count;
	};

	const getAllMembers = (
		categoryData: any,
		categoryPath: string[]
	): { index: number; label: string }[] => {
		if (!categoryData || typeof categoryData !== "object") return [];

		let members: { index: number; label: string }[] = [];

		if (categoryPath.length === 0) {
			if (Array.isArray(categoryData.members)) {
				members = [...categoryData.members];
			}

			Object.entries(categoryData)
				.filter(([key, _]: [string, any]) => key !== "members")
				.forEach(([_, value]: [string, any]) => {
					members = [...members, ...getAllMembers(value, [])];
				});
		} else {
			const [currentCategory, ...remainingPath] = categoryPath;
			if (categoryData[currentCategory]) {
				members = getAllMembers(categoryData[currentCategory], remainingPath);
			}
		}

		return members;
	};

	const handleCategoryClick = (categoryKey: string) => {
		if (categoryKey === selectedCategory) {
			setSelectedCategory("");
			setMembers([]);
			setPage(0);
			getFeatureActivations([], null);
		} else {
			setSelectedCategory(categoryKey);
			const categoryPath = categoryKey.split("+");
			const allMembers = getAllMembers(categories, categoryPath);
			setMembers(allMembers);
			setPage(0);

			// Get first 15 members
			const itemsPerPage = 15;
			const selectedMembers = allMembers.slice(
				0 * itemsPerPage,
				(0 + 1) * itemsPerPage
			);
			const selectedIds = selectedMembers.map((m) => m.index);
			getFeatureActivations(selectedIds, categoryKey);
		}
	};

	const renderCategories = (categoryData: any, depth = 0, currentKey = "") => {
		return (
			<div>
				{Object.entries(categoryData)
					.filter(([key, _]: [string, any]) => key !== "members")
					.map(([key, value]: [string, any]) => {
						const categoryKey =
							currentKey + (currentKey !== "" ? "+" : "") + key;
						const totalCount = getTotalCount(value);
						const isSelected = selectedCategory.startsWith(categoryKey);

						const hasChildren = typeof value === "object" && value !== null;
						const showChildren =
							hasChildren &&
							categoryKey.split("+").length > depth &&
							categoryKey.split("+")[depth] ===
								selectedCategory.split("+")[depth];

						return (
							<div
								key={key}
								style={{
									marginLeft: 20 * depth + "px",
									backgroundColor: "white",
								}}
							>
								<div
									style={{
										display: "flex",
										flexDirection: "row",
										paddingLeft: "4px",
									}}
								>
									<div
										style={{
											marginRight: "5px",
											marginTop: "auto",
											marginBottom: "auto",
											fontSize: "12px",
											color:
												hasChildren &&
												!(Object.keys(value).length == 1 && value.members)
													? "black"
													: "transparent",
										}}
									>
										▶
									</div>

									<span
										onClick={() => handleCategoryClick(categoryKey)}
										style={{
											backgroundColor: isSelected ? "lightgrey" : "white",
											color: "black",
											padding: "2px 0px",
											cursor: "pointer",
											borderBottom: "1px solid grey",
										}}
									>
										{key.trim()} ({totalCount})
									</span>
								</div>
								{showChildren &&
									renderCategories(value, depth + 1, categoryKey)}
							</div>
						);
					})}
			</div>
		);
	};

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
		const selectedMembers = members.slice(
			newPage * itemsPerPage,
			(newPage + 1) * itemsPerPage
		);
		const selectedIds = selectedMembers.map((m) => m.index);
		console.log(selectedIds);
		getFeatureActivations(selectedIds);
	};

	return (
		<div
			style={{
				marginTop: "20px",
				position: "relative",
			}}
		>
			<div
				style={{
					position: "absolute",
					top: "-20px",
					left: "-370px",
					width: "350px",
				}}
			>
				<h3>Categories</h3>
				<div
					style={{
						height: "705px",
						overflowY: "auto",
						borderRadius: BORDER_RADIUS,
					}}
				>
					{renderCategories(categories)}
				</div>
			</div>
			<h3>
				{selectedCategory
					.split("+")
					.map(
						(c, i) =>
							c + (i !== selectedCategory.split("+").length - 1 ? " - " : "")
					)}
			</h3>
			{members.length > 0 && (
				<div>
					<div style={{ marginTop: "10px", marginBottom: "10px" }}>
						<select
							value={page}
							onChange={(e) => handlePageChange(Number(e.target.value))}
							style={{ width: "100%", padding: "5px" }}
						>
							{Array.from(
								{ length: Math.ceil(members.length / itemsPerPage) },
								(_, i) => (
									<option key={i} value={i}>
										{i * itemsPerPage + 1} -{" "}
										{Math.min((i + 1) * itemsPerPage, members.length)}
									</option>
								)
							)}
						</select>
					</div>
				</div>
			)}
		</div>
	);
};

const Explorer = ({
	processedFeatures,
	setProcessedFeatures,
}: {
	processedFeatures: ProcessedFeaturesType[];
	setProcessedFeatures: React.Dispatch<
		React.SetStateAction<ProcessedFeaturesType[]>
	>;
}) => {
	const [processingState, setProcessingState] = useState("");
	// const [currentCategory, setCurrentCategory] = useState<string | null>(null);

	let currentCategory: string | null = null;

	const getFeatureActivations = async (
		features: number[],
		categoryKey: string | null = null
	) => {
		setProcessedFeatures([]);
		currentCategory = categoryKey;

		// console.log("categoryKey: ", categoryKey);

		try {
			setProcessingState("Processing features...");
			const activations = await getActivations(features);
			// console.log(activations);

			// console.log("categoryKey after activation: ", categoryKey);
			// console.log("currentCategory: ", currentCategory);

			// Use categoryKey instead of currentCategory
			if (categoryKey === currentCategory) {
				setProcessingState("");
				setProcessedFeatures(activations);
			}
		} catch (error) {
			console.error("Error processing features:", error);
			setProcessingState("Error processing features");
			setTimeout(() => {
				setProcessingState("");
			}, 1000);
		}
	};

	// const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
	// 	e.preventDefault();
	// 	if (featureInput.trim() !== "") {
	// 		setProcessingState("Processing features...");

	// 		// Parse input string to array of numbers
	// 		const features = featureInput
	// 			.split(",")
	// 			.map((f) => parseInt(f.trim()))
	// 			.filter((f) => !isNaN(f));

	// 		getFeatureActivations(features);
	// 		// try {
	// 		// 	const activations = await getActivations(features);
	// 		// 	console.log(activations);
	// 		// 	setProcessingState("");

	// 		// 	setProcessedFeatures(activations);
	// 		// 	// setUniqueFeatures(activations);
	// 		// 	setFeatureInput("");
	// 		// } catch (error) {
	// 		// 	console.error("Error processing features:", error);
	// 		// 	setProcessingState("Error processing features");
	// 		// }
	// 	}
	// };

	return (
		<div style={{ width: CONTAINER_WIDTH }}>
			{/* <form
				onSubmit={handleSubmit}
				style={{ marginTop: "60px", width: "100%" }}
			>
				<textarea
					value={featureInput}
					onChange={(e) => setFeatureInput(e.target.value)}
					placeholder="Enter feature numbers separated by commas (e.g., 1, 2, 3)"
					rows={5}
					style={{
						width: "100%",
						marginBottom: "10px",
						borderRadius: BORDER_RADIUS,
						fontSize: FONT_SIZE,
						padding: PADDING,
					}}
				/>
				<div style={{ display: "flex", flexDirection: "row" }}>
					<button
						type="submit"
						style={{
							backgroundColor: "white",
							width: "fit-content",
							border: "none",
							color: "grey",
							textAlign: "center",
							textDecoration: "none",
							display: "inline-block",
							margin: "4px 2px",
							cursor: "pointer",
							whiteSpace: "nowrap",
							borderRadius: BORDER_RADIUS,
							fontSize: FONT_SIZE,
							padding: PADDING,
						}}
					>
						Process Features
					</button>
					<div style={{ marginLeft: "10px" }}>{processingState}</div>
				</div>
			</form> */}
			<Category
				categories={categories}
				getFeatureActivations={getFeatureActivations}
			/>
			{processingState !== "" && processedFeatures.length == 0 && (
				<div>
					<LoadingIcon />
				</div>
			)}
		</div>
	);
};

export default Explorer;
