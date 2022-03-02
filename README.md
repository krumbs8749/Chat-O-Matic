# Realtime Chat App

This is web app that allows user to chat in realtime using the GraphQl subscriptions and Apollo client.

## Table of contents

- [Overview](#overview)
  - [The Project](#the-project)
- [My process](#my-process)
  - [Built with](#built-with)
  - [Server](#server)
  - [CLient](#client)
  - [Getting the new messages in realtime](#getting-the-new-messages-in-realtime)
  - [Solution using GraphQL subscriptions](#solution-using-graphql-subscriptions)
  - [Websocket connection](#websocket-connection)
  - [Module Federations](#module-federations-home-page)
- [Continued development](#continued-development)
- [Useful resources](#useful-resources)
- [Author](#author)


## Overview

### The Project

**Users should be able to:**
Chat in a virtual room and receive the messages in realtime. 
If two people were to open the link at the same time and chat with different ids, they would be able to see each other's messages immediately 

This project is broken down to a three components:
  - client
  - server 
  - home-page

Each component serves different purposes for the creation of this project.


## My process


### Built with

- React
- Nodemon
- Apollo
- GraphQL Subscriptions
- Websockets
- Module federation



### Server
**Server component is used to deploy a GraphQL server that allow users from the client side of application to request and add data to it dynamically**

- Every GraphQl needs a schema and this is mine
```js
const serverSchema = () => {
  // variable 
  const messages = [];

  // Schema of the GraphQl
  // Messages: describes the contents of  a data that can be queried 
  // Query: describes the set of possible datas that can be queried
  // Mutation: governs how the the client can update/push data to the server
  const typeDefs = `
    type Message {
        id: ID!
        user: String!
        content: String!
    }
    type Query {
        messages: [Message!] 
    }
    type Mutation {
        postMessage(user: String!, content: String!): ID!
    }
`;

const resolvers = {
    Query: {
        messages: () => messages,
    },
    Mutation: {
        postMessage: (parent, {user, content}) => {
            const id = messages.length;
            messages.push({
                id,
                user,
                content
            });
            return id;
        }
    },
}
```
- We need to host the server on a side, for me it's on my localHost
```js
const startServer = () => {
    const { GraphQLServer } = require('graphql-yoga');
    const server = new GraphQLServer({ typeDefs , resolvers);  
    server.start(({port}) => {
    console.log(`Server on http://localhost:${port}/`);
})
}
```
[The resulting GraphQL side](./graphQl.png)

### Client
**The UI is built with React library and SCSS. To connect with the server side, I used the [Apollo client](https://www.apollographql.com/docs/react/get-started/).**

-  This is how i interact with server using Apollo client
```js
const interactingWithServer = () => {

  // First is by importing all the necessary components from the Apollo client
  import {
    ApolloClient,
    InMemoryCache,
    ApolloProvider,
    useQuery,
    useMutation,
    gql
  } from "@apollo/client";

  // Create a new client with the port/hosting pages that we would like 
  // to deploy or client side on
  const client = new ApolloClient({
    link, // thhis link here is using a websocket link which will be explain further down
    uri: 'http://localhost:4000/',
    cache: new InMemoryCache()
    });


    // Query - requesting data from the server
    // this is exactly the as how we would write on the GraphQl server side
    const GET_MESSAGES = gql`
    query{
        messages{
            id
            content
            user
        }
    }`;
    const { data  } = useQuery(GET_MESSAGES); // 'data' will contain the array of the pushed messages in the server

    // Mutation - pushing data to the server
    // this is exactly the as how we would write on the GraphQl server side
    const POST_MESSAGE = gql`
    mutation($user: String!, $content: String!) {
        postMessage(user: $user, content: $content)
    }`;
    const [postMessage] = useMutation(POST_MESSAGE);
    postMessage({variables: state) // state here is from the React.useState 
                                   // which stores the exact same contents as in the message from the server
                                   // {user, content}
}
```
### Getting the new messages in realtime

- Initially there's a way to ask the client side to request the data from the server within a specific amount of interval. This can be added in the {useQuery} function.
```js
const pollInterval = () => {
    const { data  } = useQuery(GET_MESSAGES, {
        pollInterval: 500 // request data from the server every 500 milliseconds
    });
}
```
- However, this is not effcient way to go around it as the client will keep hitting on the server even when no new messages is being sent. This would result in a load of overhead and API request to the server that's there for no reasons.

### Solution using GraphQL subscriptions

- First we need to create a new context called pubsub which we import from graphql
```js
const createPubSub = () => {
    const { GraphQLServer, PubSub } = require('graphql-yoga');
    const pubsub = new PubSub();
    const server = new GraphQLServer({ typeDefs , resolvers, context: {pubsub}});
}
```
- Then in my schema I added the subscription

```js
const addSubscriptionOnSchema = () => {
    // the previous elements in the schema must also be here
    // subscription has the exact same element as the Query
    const typeDefs = `
    type Subscription {
        messages: [Message!]
    }
    `; 

    // keep track of who are currently subscribing 
    const subscribers = [];
    // add the new subscribers
    const onMessagesUpdates = (fn) => subscribers.push(fn);
    const resolvers = {
        ...prev,
        Subscription: {
            messages: {
                subscribe: (parent, args, { pubsub }) => {

                    // get a nice random string of decimal number for our channel
                    const channel = Math.random().toString(36).slice(2,15); 

                    // the callback would use the pubsub publish 
                    // to send the subscribers (users) to send new messages
                    onMessagesUpdates(() => pubsub.publish(channel, {messages }));

                    // automatically send the data immediately  after subscribing
                    // user don't need to wait for something to actually post the messages in order to see the messages
                    setTimeout(() => pubsub.publish(channel, { messages }), 0);

                    // and finally return the async iterator
                    return pubsub.asyncIterator(channel);
                },
            }
        }
        // Lastly we need to alert the system everytime there are new messages
        // occur when any user post a message (through Mutation)
        Mutation: {
            // Same as before
            subscribers.forEach((fn) => fn()); // added iterator that would simply call each callback function
                                               // this consequently will send the data to the users (subscribers)
            // will return id
        }
        }
    }
}
```

### Websocket connection
**Essentially is an upgraded version of normal HTTP connection. Websocket flips around the connection making it a live, continuous connection between the server and the client. GraphQL protocol which sits on top of this could then accept incoming data from the server when subscription is updated.**

On the client side:

- First we need to initialize the WebSocketLink
```js
const webSocktLink = () => {
    import { WebSocketLink } from '@apollo/client/link/ws';
    const link = new WebSocketLink({
        uri: 'ws://localhost:4000/',
        options: {
        reconnect: true
        }
    });
}
```
- Then we add the link to the client 
```js
const addToClient = () => {
    const client = new ApolloClient({
        link,
        uri: 'http://localhost:4000/',
        cache: new InMemoryCache()
    });
}
```
- Now, instead of using **query**, ww will use **subscription** instead. Now we no longer need the poll to get the messages immediately.
```js
const useSubscription = () => {
    import {
        useSubscription, // useQuery is then removed as we no longer use it
    } from "@apollo/client";

    // we are now subscribing to the data rather then quering it
    const GET_MESSAGES = gql`
    subscription{
        messages{
            id
            content
            user
        }
    }`;
    const { data  } = useSubscription(GET_MESSAGES); // pollInterval no longer needed
}
```

### Module Federations (home-page)
**Generally, in medium to large size companies, an app is composed of a bunch of smaller apps. In this module, sharing code could be a little bit problematic. Module federation allow us to take parts and pieces of the app and share it directly out of the app. It is also a live system, which means for example if the client component is updated, then it would automatically update the app that's consuming the chat component.**

- In the webpack configuration of the newly created React app, tweak the module federation 
```js
const homePage = () = > {
    new ModuleFederationPlugin({
      name: "home",
      filename: "remoteEntry.js",
      remotes: {
        chat: "chat@http://localhost:8080/remoteEntry.js"
      },
      exposes: {},
      shared: {
        ...deps,
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: deps["react-dom"],
        },
      },
    }),
}
```
- Now we need to expose the client app / component through the module federation
```js
const client = () =>{
    new ModuleFederationPlugin({
      name: "chat",
      filename: "remoteEntry.js",
      remotes: {},
      exposes: {
        "./Chat" : "./src/Chat", // this would expose the whole chat component
                                 // including the Apollo provider and all of the components insides
      },
      shared: {
        ...deps,
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: deps["react-dom"],
        },
      },
    }),
}
```
- Now we will display it to the home-page component. First in the index.html
 ```html
    <head>
    <script src="http://localhost:8080/remoteEntry.js"></script> <!-- Add the link that host he chat component to the script-->
    </head>
 ```
 -Then in the React
 ```js
    const homePageApp = () => {
        
        // firstly import the chat component
        import Chat from 'chat/Chat'

        // then just render it to the DOM
        <Chat />
    }
 ```
 Now, in our application, we are importing chat as a react component. It is the actual react code from another application, automatically imported and live at run time.


## Continued development

Throughout the project I have learned a lot especially on the topic GraphQL and the Module Federation.
In my future projects, I will try to explore more on the use cases of GraphQL and have a better understanding of GraphQL subscriptions and the Module Federations as it is still quite confusing to me.


## Useful resources

- [Apollo client](https://www.apollographql.com/docs/react/get-started/) - The documentation on the website is pretty thorough which had helped completing the project
- [nodemon](https://www.npmjs.com/package/nodemon) - nodemon is a tool that helps develop node.js based app by automatically restarting the node app when file changes in the directory are detected. With this, don't need to restart my app manually everytime I made any changes to it 


## Author

- Twitter - [@krumbs8749](https://twitter.com/krumbs8749)



