"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddProduct() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/products/new");
	}, [router]);

	return null;
}
