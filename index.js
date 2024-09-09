const http = require('http');
const https = require('https');
const fs = require('fs');
const credentials = require("./auth/credentials.json");
// const { Stream } = require('stream');

const port = 3000;
const server = http.createServer();

server.on("listening", listening_handler);
server.listen(port);
server.on("listening", listening_handler);
function listening_handler(){
	console.log(`Now Listening on Port ${port}`);
}

server.on("request", request_handler);
function request_handler(req, res){
	console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);

	if(req.url === "/"){
		const form = fs.createReadStream("html/index.html");
		res.writeHead(200, {"Content-Type": "text/html"});
		form.pipe(res);
	}

	else if (req.url === "/images/banner.jpg"){
        const banner = fs.createReadStream('images/banner.jpg');
        res.writeHead(200, {"Content-Type":"image/jpeg"});
        banner.pipe(res);
	}

	else if(req.url.startsWith("/search")){
		const user_input = new URL(req.url, `https://${req.headers.host}`).searchParams;
		console.log(user_input);
		const word = user_input.get('word');
		
		if(word == null || word == ""){
			res.writeHead(404, {"Content-Type": "text/html"});
			res.end("<h1>Missing Input</h1>");
		}
		
		else{
			const poke_api = https.request(`https://pokeapi.co/api/v2/pokemon/${word}`);
			poke_api.on("response", poke_res => process_info(poke_res, parse_info, res));
			console.log(`API 1 Complete`);
			//setTimeout(()=>poke_api.end() , 5000);		SYNC TEST
			poke_api.end();
		}
	}

	else{
		res.writeHead(404, {"Content-Type": "text/html"});
		res.end("<h1>Not Found</h1>");
	}
}

function process_info(stream, callback, ...args){
	let body = "";
	stream.on("data", chunk => body += chunk);
	stream.on("end", () => callback(body, ...args));
}

function parse_info(data, res){
	//console.log(data);

	if(data === 'Not Found'){
		res.writeHead(404, {"Content-Type": "text/html"});
		res.end("<h1>Not Found</h1>");
	}
	
	else{
		const lookup = JSON.parse(data);
		if(typeof lookup === `object`){
			let firstSearch = lookup.species.name;
			//console.log(firstSearch);
			get_word_information(firstSearch, res);
		}
	}
}

function get_word_information(info, res){
	const detect_endpoint = `https://${credentials['Host']}${info}`
	const detect_request = https.request(`${detect_endpoint}&key=${credentials['Authorization-Key']}`);
	detect_request.once("response", word_res => process_info(word_res, parse_final, res));
	detect_request.end();
}

function parse_final(data, res){
	const lookup = JSON.parse(data);
	let results = "<h1>No Results</h1>";
	if(typeof lookup === `object`){
		let finalSearch = lookup.data.detections[0].language;
		results = `<h1>Language Result: ${finalSearch}</h1>`;
		console.log(finalSearch);
	}
	res.writeHead(200, {"Content-Type": "text/html"});
	res.end(results);

}