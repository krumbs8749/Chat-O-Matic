import React from "react";
import ReactDOM from "react-dom";

import "./index.css";
import Chat from 'chat/Chat'

const App = () => (
    <div className="main" style={{"display" : "flex","flexDirection" : "column", "alignItems" : "center", "margin" : "20px 70px"}}>
        <p>In 1992, Tim Berners-Lee circulated a document titled “HTML Tags,” which outlined just 20 tags, many of which are now obsolete or have taken other forms. The first surviving tag to be defined in the document, after the crucial anchor tag, is the paragraph tag. It wasn’t until 1993 that a discussion emerged on the proposed image tag.</p>
       
        <h1>CHAT</h1>
        <Chat />
        <div>Chat window here</div>
        <p>As designers, we are frequently and incorrectly reminded that our job is to “make things pretty.” We are indeed designers — not artists — and there is no place for formalism in good design. Web design has a function, and that function is to communicate the message for which the Web page was conceived. The medium is not the message.</p>
    </div>
);

ReactDOM.render(<App />, document.getElementById("app"));
