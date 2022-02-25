import React, { useState } from "react";
import "./Chat.scss"
import {
    ApolloClient,
    InMemoryCache,
    ApolloProvider,
    useSubscription,
    useMutation,
    gql
  } from "@apollo/client";
import { WebSocketLink } from '@apollo/client/link/ws';


const link = new WebSocketLink({
    uri: 'ws://localhost:4000/',
    options: {
      reconnect: true
    }
});

const client = new ApolloClient({
    link,
    uri: 'http://localhost:4000/',
    cache: new InMemoryCache()
});
;


const GET_MESSAGES = gql`
subscription{
    messages{
        id
        content
        user
    }
}`;

const POST_MESSAGE = gql`
mutation($user: String!, $content: String!) {
    postMessage(user: $user, content: $content)
}`;

const Message = ({user}) => {
    const { data  } = useSubscription(GET_MESSAGES);
    if(!data){
        return null;
    }
    return (
        <>
            {
                data.messages.map(({id, user: messageUser, content}) => (
                    <div className={"chatArea "  + (user === messageUser ? "me" : "others")}>
                        {
                                user !== messageUser && 
                            (<span className="profile">
                                {messageUser.slice(0,2).toUpperCase()}
                            </span>)
                        }
                        <div className={"textbox "  + (user === messageUser ? "me" : "others")}>
                            {content}
                        </div>
                    </div>
                ))
                    
            }
        </>
    )
}


const Chat = () => {
    const [state, setState] = useState({
        user: "Ikram",
        content: ""
    })
    const [postMessage] = useMutation(POST_MESSAGE);
    
    const onSend = event => {
        event.preventDefault();
        if(state.content.length > 0){
            postMessage({
                variables: state,
            })
        }
        setState(prev => ({
            ...prev,
            content: ""
        }))
        
    }
    return (
        
    <div className="Chat">
        <Message  user={state.user}/>
        <form className="inputForm" onSubmit={onSend}>
            <input
                value={state.user}
                className="user"
                onChange={event => {
                    setState(prev => ({
                        ...prev,
                        user: event.target.value
                    }))
                }}
            ></input>
            <input
                value={state.content}
                className="content"
                autoFocus
                onChange={event => {
                    setState(prev => ({
                        ...prev,
                        content: event.target.value
                    }))
                }}
                onKeyUp={event => {
                    if(event.key === 13){
                        onSend();
                    }
                }}
            ></input>
            <button type="submit" value="Submit">Send</button>
        </form>
    </div>
    )
}

export default () => {
    return (
        <ApolloProvider client={client}>
            <Chat />
        </ApolloProvider>
    )
}