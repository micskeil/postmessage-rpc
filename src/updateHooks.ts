// export default function initUpdateHooks(messageSocket) {
// 	const currentMessageSocket = messageSocket;
// 	let hooksFromParent = {};
//
// 	currentMessageSocket.addListener("error", (payload) =>
// 		console.warn(payload),
// 	);
//
// 	return function ({ hooks, resetHooks }) {
// 		if (resetHooks) {
// 			Object.keys(hooksFromParent).forEach((hook) => {
// 				currentMessageSocket.removeListener(hook);
// 			});
// 			hooksFromParent = hooks;
// 		} else {
// 			hooksFromParent = { ...hooksFromParent, ...hooks };
// 		}
// 		Object.keys(hooksFromParent).forEach((hook) => {
// 			if (
// 				typeof hooksFromParent[hook] !== "function" &&
// 				hooksFromParent[hook] === null
// 			) {
// 				currentMessageSocket.removeListener(hook);
// 				return;
// 			}
// 			currentMessageSocket.addListener(hook, (payload) =>
// 				hooksFromParent[hook](payload),
// 			);
// 		});
//
// 		return Object.keys(hooksFromParent).filter(
// 			(hook) =>
// 				typeof hooksFromParent[hook] === "function" &&
// 				hooksFromParent[hook] !== null,
// 		);
// 	};
// }
