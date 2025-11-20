async function query(text) {
	const response = await fetch(
		"http://localhost:9000/api/v1/sentiment",
		{
			headers: {
				"Content-Type": "application/json",
			},
			method: "POST",
			body: JSON.stringify(text),
		}
	);
	const result = await response.json();
	return result;
};

module.exports = async function analyzeSentiment(text) {
  const res = await query({ text: text });
  const pos = res.positive;
  const rating = 5 * pos;
  return rating;
};
