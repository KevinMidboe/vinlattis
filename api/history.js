const path = require("path");

const Winner = require(path.join(__dirname, "/schemas/Highscore"));
const wineRepository = require(path.join(__dirname, "/wine"));

class HistoryByDateNotFound extends Error {
  constructor(message = "History for given date not found.") {
    super(message);
    this.name = "HistoryByDateNotFound";
    this.statusCode = 404;
  }
}

class HistoryForUserNotFound extends Error {
  constructor(message = "History for given user not found.") {
    super(message);
    this.name = "HistoryForUserNotFound";
    this.statusCode = 404;
  }
}

// highscore
const addWinnerWithWine = async (winner, wine) => {
  const exisitingWinner = await Winner.findOne({
    name: winner.name
  });
  const savedWine = await wineRepository.addWine(wine);

  const date = new Date();
  date.setHours(5, 0, 0, 0);
  const winObject = {
    date: date,
    wine: savedWine,
    color: winner.color
  };
  if (exisitingWinner == undefined) {
    const newWinner = new Winner({
      name: winner.name,
      wins: [winObject]
    });

    await newWinner.save();
  } else {
    exisitingWinner.wins.push(winObject);
    exisitingWinner.markModified("wins");
    await exisitingWinner.save();
  }

  return exisitingWinner;
};

// lottery
const all = (includeWines = false) => {
  if (includeWines === false) {
    return Winner.find().sort("-wins.date");
  } else {
    return Winner.find()
      .sort("-wins.date")
      .populate("wins.wine");
  }
};

// lottery
const byDate = date => {
  const startQueryDate = new Date(date.setHours(0, 0, 0, 0));
  const endQueryDate = new Date(date.setHours(24, 59, 59, 99));
  const query = [
    {
      $match: {
        "wins.date": {
          $gte: startQueryDate,
          $lte: endQueryDate
        }
      }
    },
    { $unwind: "$wins" },
    {
      $match: {
        "wins.date": {
          $gte: startQueryDate,
          $lte: endQueryDate
        }
      }
    },
    {
      $lookup: {
        from: "wines",
        localField: "wins.wine",
        foreignField: "_id",
        as: "wins.wine"
      }
    },
    { $unwind: "$wins.wine" },
    {
      $project: {
        name: "$name",
        date: "$wins.date",
        color: "$wins.color",
        wine: "$wins.wine"
      }
    }
  ];

  return Winner.aggregate(query).then(winners => {
    if (winners.length == 0) {
      throw new HistoryByDateNotFound();
    }
    return winners;
  });
};

// highscore
const byName = (name, sort = "desc") => {
  return Winner.findOne({ name }, ["name", "wins"])
    .sort("-wins.date")
    .populate("wins.wine")
    .then(winner => {
      if (winner) {
        winner.wins = sort !== "asc" ? winner.wins.reverse() : winner.wins;
        return winner;
      } else {
        throw new HistoryForUserNotFound();
      }
    });
};

// highscore
const search = (query, sort = "desc") => {
  return Winner.find({ name: { $regex: query, $options: "i" } }, ["name"]).then(winners => {
    if (winners) {
      winners = sort === "desc" ? winners.reverse() : winners;
      return winners;
    } else {
      throw new HistoryForUserNotFound();
    }
  });
};

// lottery
const latest = () => {
  const query = [
    {
      $unwind: "$wins"
    },
    {
      $lookup: {
        from: "wines",
        localField: "wins.wine",
        foreignField: "_id",
        as: "wins.wine"
      }
    },
    {
      $group: {
        _id: "$wins.date",
        winners: {
          $push: {
            _id: "$_id",
            name: "$name",
            color: "$wins.color",
            wine: "$wins.wine"
          }
        }
      }
    },
    {
      $project: {
        date: "$_id",
        winners: "$winners"
      }
    },
    {
      $sort: {
        _id: -1
      }
    },
    {
      $limit: 1
    }
  ];

  return Winner.aggregate(query).then(winners => winners[0]);
};

// lottery - byDate
const groupByDate = (includeWines = false, sort = "asc") => {
  const sortDirection = sort == "asc" ? -1 : 1;
  const query = [
    {
      $unwind: "$wins"
    },
    {
      $group: {
        _id: "$wins.date",
        winners: {
          $push: {
            _id: "$_id",
            name: "$name",
            color: "$wins.color",
            wine: "$wins.wine"
          }
        }
      }
    },
    {
      $project: {
        date: "$_id",
        winners: "$winners"
      }
    },
    {
      $sort: {
        date: sortDirection
      }
    }
  ];

  if (includeWines) {
    query.splice(1, 0, {
      $lookup: {
        from: "wines",
        localField: "wins.wine",
        foreignField: "_id",
        as: "wins.wine"
      }
    });
  }

  return Winner.aggregate(query);
};

// highscore - byColor
const groupByColor = (includeWines = false) => {
  const query = [
    {
      $unwind: "$wins"
    },
    {
      $group: {
        _id: "$wins.color",
        winners: {
          $push: {
            _id: "$_id",
            name: "$name",
            date: "$wins.date",
            wine: "$wins.wine"
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        color: "$_id",
        count: "$count",
        winners: "$winners"
      }
    },
    {
      $sort: {
        _id: -1
      }
    }
  ];

  if (includeWines) {
    query.splice(1, 0, {
      $lookup: {
        from: "wines",
        localField: "wins.wine",
        foreignField: "_id",
        as: "wins.wine"
      }
    });
  }

  return Winner.aggregate(query);
};

// highscore - byWineOccurences

// highscore - byWinCount
const orderByWins = (includeWines = false, limit = undefined) => {
  let query = [
    {
      $project: {
        name: "$name",
        wins: "$wins",
        totalWins: { $size: "$wins" }
      }
    },
    {
      $sort: {
        totalWins: -1,
        "wins.date": -1
      }
    }
  ];

  if (includeWines) {
    const includeWinesSubQuery = [
      {
        $unwind: "$wins"
      },
      {
        $lookup: {
          from: "wines",
          localField: "wins.wine",
          foreignField: "_id",
          as: "wins.wine"
        }
      },
      {
        $unwind: "$wins._id"
      },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          totalWins: { $first: "$totalWins" },
          wins: { $push: "$wins" }
        }
      }
    ];

    query = includeWinesSubQuery.concat(query);
  }

  return Winner.aggregate(query).then(winners => {
    if (limit == null) {
      return winners;
    }

    return winners.slice(0, limit);
  });
};

module.exports = {
  addWinnerWithWine,
  all,
  byDate,
  byName,
  search,
  latest,
  groupByDate,
  groupByColor,
  orderByWins
};
