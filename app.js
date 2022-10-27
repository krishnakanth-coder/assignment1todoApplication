const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const { format } = require("date-fns");
const isValid = require("date-fns/isValid");
const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3001, () => console.log("Server Running "));
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

const dueDateValidation = (request, response, next) => {
  let isNotValid = false;
  let isNotValidResponse = "";
  const { date } = request.query;
  if (date !== undefined) {
    if (isValid(Date.parse(date))) {
      isNotValidResponse += "";
    } else {
      isNotValidResponse = "Invalid Due Date";
      isNotValid = true;
    }
  }

  if (isNotValid) {
    response.status(400);
    response.send(isNotValidResponse);
  } else {
    next();
  }
};

const validationStatus = (request, response, next) => {
  const validationOfBody = request.body;
  const validationOfQuery = request.query;
  if (validationOfBody !== undefined || validationOfQuery !== undefined) {
    let isNotValid = false;
    const { status, priority, category, dueDate } =
      Object.keys(validationOfBody).length !== 0
        ? validationOfBody
        : validationOfQuery;

    let isNotValidResponse = "";
    console.log(status, priority, category, dueDate);
    if (status !== undefined) {
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        isNotValidResponse += "";
      } else {
        isNotValidResponse = "Invalid Todo Status";
        isNotValid = true;
      }
    }
    if (priority !== undefined) {
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        isNotValidResponse += "";
      } else {
        isNotValidResponse = "Invalid Todo Priority";
        isNotValid = true;
      }
    }
    if (category !== undefined) {
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        isNotValidResponse += "";
      } else {
        isNotValidResponse = "Invalid Todo Category";
        isNotValid = true;
      }
    }
    if (dueDate !== undefined) {
      if (isValid(Date.parse(dueDate))) {
        isNotValidResponse += "";
      } else {
        isNotValidResponse = "Invalid  Due Date";
        isNotValid = true;
      }
    }
    console.log(isNotValid);
    if (isNotValid) {
      response.status(400);
      response.send(isNotValidResponse);
    } else {
      next();
    }
  }
};

//1-API Get Todo;
app.get("/todos/", validationStatus, async (request, response) => {
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
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
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND category = '${category}';`;
      break;
    case hasCategoryAndPriorityProperties(request.query):
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

  const data = await database.all(getTodosQuery);
  response.send(data);
});
// //2API return a specific todo based on the todo ID

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const selectQuery = `
        SELECT * FROM todo
        WHERE id = ${todoId};`;
  const getData = await database.all(selectQuery);
  response.send(getData);
});

// //3 API return all todos based on query params date:
app.get("/agenda/", dueDateValidation, async (request, response) => {
  const { date } = request.query;
  const date_a = format(new Date(date), "yyyy-MM-dd").toString();
  const selectData = `
    SELECT * FROM todo
    WHERE due_date = "${date_a}";`;
  const dbData = await database.all(selectData);
  response.send(dbData);
});

//4 API Create a todo in the todo table,
app.post("/todos/", validationStatus, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const date = format(new Date(dueDate), "yyyy-MM-dd").toString();
  const postTodoData = `
        INSERT INTO todo
            (id,todo,priority,status,category,due_date)
        VALUES
            (${id},"${todo}","${priority}","${status}","${category}","${date}");`;
  const postTodo = await database.run(postTodoData);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", validationStatus, async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updatedItem = "";
  if (requestBody.status !== undefined) {
    updatedItem += "Status Updated";
  }
  if (requestBody.category !== undefined) {
    updatedItem += "Category Updated";
  }
  if (requestBody.priority !== undefined) {
    updatedItem += "Priority Updated";
  }
  if (requestBody.todo !== undefined) {
    updatedItem += "Todo Updated";
  }
  if (requestBody.dueDate !== undefined) {
    updatedItem += "Due Date Updated";
  }

  let responseStatus;
  const getTodo = `select * from todo where id=${todoId};`;
  const preTodo = await database.get(getTodo);
  const {
    todo = preTodo.todo,
    priority = preTodo.priority,
    status = preTodo.status,
    category = preTodo.category,
    dueDate = preTodo.due_date,
  } = request.body;

  const date = format(new Date(dueDate), "yyyy-MM-dd").toString();
  const updateTodoQuery = `
    UPDATE todo
    SET
      todo = "${todo}",
      priority = "${priority}",
      status = "${status}",
      category = "${category}",
      due_date = "${date}"
      WHERE id = ${todoId};`;
  const updateDb = await database.run(updateTodoQuery);
  response.send(updatedItem);
});

//API6 Delete todo
app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        delete  from todo where id = ${todoId} ;`;
  const deleteData = await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
