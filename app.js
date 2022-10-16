const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
//let date = require("date-and-time");
const { format } = require("date-fns");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

//2021-1-21, format the date to 2021-01-21
// const value = date.format(new Date("2021-1-21"), "YYYY-MM-DD");
// console.log("date and time : " + value);

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () => console.log("Server Running "));
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};
const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};
const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

app.get("/todos/", async (request, response) => {
  const { status, priority, search_q = "", category } = request.query;
  //console.log(status, priority, search_q, category);
  let responseMsg;
  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      responseMsg = "Invalid Todo Status&Priority";
      getTodosQuery = `
      SELECT
        *
      FROM
        todo
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      break;
    case hasCategoryAndStatusProperties(request.query):
      responseMsg = "Invalid Todo Status&Category";
      console.log(category, status);
      getTodosQuery = `
      SELECT
        *
      FROM
        todo
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND status = '${status}';`;
      break;
    case hasCategoryAndPriorityProperties(request.query):
      responseMsg = "Invalid Todo Category&Priority";
      getTodosQuery = `
      SELECT
        *
      FROM
        todo
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}'
        AND priority = '${priority}';`;
      break;
    case hasPriorityProperty(request.query):
      responseMsg = "Invalid Todo Priority";
      getTodosQuery = `
      SELECT
        *
      FROM
        todo
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      break;
    case hasStatusProperty(request.query):
      responseMsg = "Invalid Todo Status";
      getTodosQuery = `
      SELECT
        *
      FROM
        todo
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      break;
    case hasCategoryProperty(request.query):
      responseMsg = "Invalid Todo Category";
      getTodosQuery = `
      SELECT
        *
      FROM
        todo
      WHERE
        todo LIKE '%${search_q}%'
        AND category = '${category}';`;
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo
      WHERE
        todo LIKE '%${search_q}%';`;
  }
  const getResponse = await database.all(getTodosQuery);
  console.log(getResponse.length);
  if (getResponse.length == 0) {
    response.status(400);
    response.send(responseMsg);
  } else {
    response.send(getResponse);
  }
  //response.send(responseMsg);
});

// //2API return a specific todo based on the todo ID

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const selectQuery = `
        SELECT * FROM todo
        WHERE id = ${todoId};`;
  const getData = await database.get(selectQuery);
  //console.log(getData);
  response.send(getData);
});

// //3 API return all todos based on query params date:
app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  let value = format(new Date(date), "yyyy-MM-dd");
  let b = value.toString();

  const selectData = `
    SELECT * FROM todo
    WHERE due_date = "${b}";`;
  const dbData = await database.get(selectData);
  if (dbData === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    response.send(dbData);
  }
});

// //4 API Create a todo in the todo table,
app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  let value = format(new Date(dueDate), "yyyy-MM-dd");
  let b = value.toString();
  const postTodoData = `
        INSERT INTO todo
            (id,todo,priority,status,category,due_date)
        VALUES
            (${id},"${todo}","${priority}","${status}","${category}","${b}");`;
  const postTodo = await database.run(postTodoData);
  response.send("Todo Successfully Added");
});

// //5 API Updates the details of a specific todo based on the todo ID
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updateColumn;
  let responseStatus;

  if (requestBody.status !== undefined) {
    if (
      requestBody.status === "TODO" ||
      requestBody.status === "IN PROGRESS" ||
      requestBody.status === "DONE"
    ) {
      updateColumn = "Status Updated ";
    } else {
      updateColumn = "InValid Todo Status";
      responseStatus = 400;
    }
  }
  if (requestBody.priority !== undefined) {
    if (
      requestBody.priority === "HIGH" ||
      requestBody.priority === "MEDIUM" ||
      requestBody.priority === "LOW"
    ) {
      updateColumn = "Priority Updated ";
    } else {
      updateColumn = "InValid Todo Priority";
      responseStatus = 400;
    }
  }
  if (requestBody.category !== undefined) {
    if (
      requestBody.category === "WORK" ||
      requestBody.category === "HOME" ||
      requestBody.category === "LEARNING"
    ) {
      updateColumn = "Category Updated ";
    } else {
      updateColumn = "InValid Todo Category";
      responseStatus = 400;
    }
  }
  if (requestBody.todo !== undefined) {
    updateColumn = "Todo Updated ";
    responseStatus = 200;
  }
  if (requestBody.dueDate !== undefined) {
    updateColumn = "Due Date Updated ";
    responseStatus = 200;
  }

  const getTodo = `select * from todo where id=${todoId};`;
  const preTodo = await database.get(getTodo);
  const {
    todo = preTodo.todo,
    priority = preTodo.priority,
    status = preTodo.status,
    category = preTodo.category,
    dueDate = preTodo.due_date,
  } = request.body;
  let value = format(new Date(dueDate), "yyyy-MM-dd");
  let b = value.toString();
  const updateTodoQuery = `
    UPDATE todo
    SET
      todo = "${todo}",
      priority = "${priority}",
      status = "${status}",
      category = "${category}",
      due_date = "${b}"
      WHERE id = ${todoId};`;
  //console.log(updateColumn);
  if (responseStatus === 400) {
    response.status(400);
    response.send(updateColumn);
  } else {
    const updateDb = await database.run(updateTodoQuery);
    response.send(updateColumn);
  }
});

//API6 Delete todo
app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        delete  from todo where id = ${todoId} ;`;
  const deleteData = await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
