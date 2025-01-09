const express=require("express");
const app=express();
const path=require("path");
const mongoose=require("mongoose");
const Animal=require("./models/Animal.js");
const Bird=require("./models/Bird.js");
const PlantAndTree = require("./models/PlantAndTree.js");
const NationalPark = require("./models/NationalPark.js");
const ExtinctSpecies = require("./models/ExtinctSpecies.js");
const EndangeredSpecies=require("./models/EndangeredSpecies.js");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");
const req = require("express/lib/request.js");
const session=require("express-session");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./models/users.js");
const flash=require("connect-flash");

const MONGO_URL="mongodb://127.0.0.1:27017/wildlife";

main().then(()=>console.log("db is connected")).catch(err => console.log(err));

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.get("/",(req,res)=>{
  res.send("Hi,I am root");
})

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);

const sessionOptions={
  secret:"secret",
  resave:false,
  saveUninitialized:true,
  cookie:{
      expires:Date.now()+7*24*60*60*1000,
      maxAge:7*24*60*60*1000,
      httpOnly:true
  }
}

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next)=>{
  res.locals.success=req.flash("success");
  res.locals.error=req.flash("error");
  res.locals.currUser=req.user;
  next();
})

app.get("/signup",(req,res)=>{
  res.render("Users/signup.ejs");
})

app.post("/signup",async(req,res)=>{
  try{
      let {username,email,password}=req.body;
      const newUser=new User({username,email});
      const registeredUser=await User.register(newUser,password);
      req.login(registeredUser,(err)=>{
        if(err){
          console.log(err);
          return next(err);
        }
        req.flash("success","Welcome to Wildlife Database");
        res.redirect("/wildlife");
      })
  }catch(e){
    console.log(e);
    res.redirect("/signup");
}
})

app.get("/login",(req,res)=>{
  res.render("Users/login.ejs");
})

app.post("/login",passport.authenticate("local",{failureRedirect:'/login', failureFlash: true}),async(req,res)=>{
  req.flash("success","Welcome to Wildlife Database");
  res.redirect("/wildlife");
})

app.get("/logout",(req,res,next)=>{
  req.logout((err)=>{
      if(err){
        console.log(err);
        return next(err);
      }
      req.flash("success","Logged out Successfully");
      res.redirect("/wildlife");
  });
})

app.get("/wildlife",(req,res)=>{
  res.render("home.ejs");
})


//animals
app.get("/wildlife/Animals",async(req,res)=>{
  let animals=await Animal.find({});
  res.render("Animals/animals.ejs",{animals});
})

app.get("/wildlife/Animals/new",async(req,res)=>{
  res.render("Animals/newAnimal.ejs");
})

app.get("/wildlife/Animals/:id",async(req,res)=>{
  let {id}=req.params;
  let animal=await Animal.findById(id);
  let nationalParks=animal.national_park_id;
  let parks=[];
  for(let np of nationalParks){
    let park=await NationalPark.findById(np);
    parks.push(park.name);
  }
  res.render("Animals/animal.ejs",{animal,parks});
})

app.get("/wildlife/Animals/:id/edit",async(req,res)=>{
  let {id}=req.params;
  let animal=await Animal.findById(id);
  res.render("Animals/editAnimal.ejs",{animal});
})

app.post("/wildlife/Animals",async(req,res)=>{
  req.flash("success","Animal Added Successfully");
  const animalData=req.body.animal;
  const national_park_id=new mongoose.Types.ObjectId(animalData.national_park);
  const newAnimal=new Animal({
    ...animalData,
    national_park_id:national_park_id
  });
  await newAnimal.save();
  const animalId=newAnimal._id;
  let park=await NationalPark.findByIdAndUpdate(
    national_park_id,
    { $push: { animal_ids: animalId } },
    { new: true, useFindAndModify: false }
  );
  if (animalData.endangered) {
    const newEndangered = new EndangeredSpecies({
      name: animalData.name, 
      animal_id: animalId,
      image:animalData.image
    });
    await newEndangered.save();
  }
  else if (animalData.extinct) {
    const newExtinct = new ExtinctSpecies({
      name: animalData.name, 
      animal_id: animalId, 
      image:animalData.image
    });
    await newExtinct.save();
  }
  res.redirect("/wildlife/Animals");
})

app.put("/wildlife/Animals/:id",async(req,res)=>{
  let {id}=req.params;
  await Animal.findByIdAndUpdate(id,{...req.body.animal});
  if(req.body.animal.extinct){
    const existingExtinctAnimal = await ExtinctSpecies.findOne({ animal_id: id });
    if(!existingExtinctAnimal){
      const extinct=new ExtinctSpecies({
        name:req.body.animal.name,
        animal_id:id,
        image:req.body.animal.image
      });
      extinct.save();
    }
  }
  res.redirect("/wildlife/Animals");
})

app.delete("/wildlife/Animals/:id",async(req,res)=>{
    try {
      const { id } = req.params;
      const animal = await Animal.findById(id);
      if (!animal) {
        return res.status(404).send("Animal not found");
      }
      await Animal.findByIdAndDelete(id);
      await EndangeredSpecies.findOneAndDelete({ animal_id: id });
      await ExtinctSpecies.findOneAndDelete({ animal_id: id });
      const park = await NationalPark.findByIdAndUpdate(
        animal.national_park_id,
        { $pull: { animal_ids: id } },
        { new: true, useFindAndModify: false }
      );
      req.flash("success","Animal deleted successfully");
      res.redirect("/wildlife/Animals");
    } catch (error) {
      console.error("Error:", error);
      res.status(500).send("Something went wrong");
    }
});


// app.get("/update",async(req,res)=>{
//   let endangered=await EndangeredSpecies.find({});
//   for(ed of endangered){
//     let animal=await Animal.findById(ed.animal_id);
//     ed.image=animal.image;
//   }
//   res.send("fd");
// })

//birds
app.get("/wildlife/Birds",async(req,res)=>{
  let birds=await Bird.find({});
  res.render("Birds/birds.ejs",{birds});
})

app.get("/wildlife/Birds/new",async(req,res)=>{
  res.render("Birds/newBird.ejs");
})

app.get("/wildlife/Birds/:id",async(req,res)=>{
  let {id}=req.params;
  let bird=await Bird.findById(id);
  let nationalParks=bird.national_park_id;
  let parks=[];
  for(let np of nationalParks){
    let park=await NationalPark.findById(np);
    parks.push(park.name);
  }
  res.render("Birds/bird.ejs",{bird,parks});
})

app.post("/wildlife/Birds",async(req,res)=>{
  const birdData=req.body.bird;
  const national_park_id=new mongoose.Types.ObjectId(birdData.national_park);
  const newBird=new Bird({
    ...birdData,
    national_park_id:national_park_id
  });
  await newBird.save();
  const birdId=newBird._id;
  let park=await NationalPark.findByIdAndUpdate(
    national_park_id,
    { $push: { bird_ids: birdId } }, 
    { new: true, useFindAndModify: false }
  );
  if (birdData.endangered) {
    const newEndangered = new EndangeredSpecies({
      name: birdData.name, 
      bird_id: birdId,  
      image:birdData.image
    });
    await newEndangered.save();

    console.log("Added to Endangered Species:", newEndangered);
  }
  if (birdData.extinct) {
    const newExtinct = new ExtinctSpecies({
      name: birdData.name, 
      bird_id: birdId, 
      image:birdData.image
    });
    await newExtinct.save();
  }
  res.redirect("/wildlife/Birds");
})

app.get("/wildlife/Birds/:id/edit",async(req,res)=>{
  let {id}=req.params;
  let bird=await Bird.findById(id);
  res.render("Birds/editBird.ejs",{bird});
})

app.put("/wildlife/Birds/:id",async(req,res)=>{
  let {id}=req.params;
  await Bird.findByIdAndUpdate(id,{...req.body.bird});
  if(req.body.bird.extinct){
    const existingExtinctBird = await ExtinctSpecies.findOne({ bird_id: id });
    if(!existingExtinctBird){
      const extinct=new ExtinctSpecies({
        name:req.body.bird.name,
        bird_id:id,
        image:birdData.image
      });
      extinct.save();
    }
  }
  res.redirect("/wildlife/Birds");
})

app.delete("/wildlife/Birds/:id",async(req,res)=>{
  try {
    const { id } = req.params;
    const bird = await Bird.findById(id);
    if (!bird) {
      return res.status(404).send("Bird not found");
    }
    await Bird.findByIdAndDelete(id);
    await EndangeredSpecies.findOneAndDelete({ bird_id: id });
    const park = await NationalPark.findByIdAndUpdate(
      bird.national_park_id,
      { $pull: { bird_ids: id } },
      { new: true, useFindAndModify: false }
    );
    if (park) {
      console.log("Updated National Park:", park);
    }
    req.flash("success","Bird deleted Successfully");
    res.redirect("/wildlife/Birds");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Something went wrong");
  }
});


//plants and trees
app.get("/wildlife/Plants-and-Trees",async(req,res)=>{
  let pts=await PlantAndTree.find({});
  res.render("PlantsAndTrees/plantsAndTrees.ejs",{pts});
})

app.get("/wildlife/Plants-and-Trees/new",async(req,res)=>{
  res.render("PlantsAndTrees/newPlant.ejs");
})

app.get("/wildlife/Plants-and-Trees/:id",async(req,res)=>{
  let {id}=req.params;
  let pt=await PlantAndTree.findById(id);
  let nationalParks=pt.national_park_id;
  let parks=[];
  for(let np of nationalParks){
    let park=await NationalPark.findById(np);
    parks.push(park.name);
  }
  res.render("PlantsAndTrees/plantAndTree.ejs",{pt,parks});
})

app.post("/wildlife/Plants-and-Trees",async(req,res)=>{
  const plantData=req.body.plant;
  const national_park_id=new mongoose.Types.ObjectId(plantData.national_park);
  const newPlant=new PlantAndTree({
    ...plantData,
    national_park_id:national_park_id
  });
  await newPlant.save();
  const plantId=newPlant._id;
  let park=await NationalPark.findByIdAndUpdate(
    national_park_id,
    { $push: { plant_ids: plantId } }, 
    { new: true, useFindAndModify: false }
  );
  res.redirect("/wildlife/Plants-and-Trees");
  
})

app.delete("/wildlife/Plants-and-Trees/:id",async(req,res)=>{
  try {
    const { id } = req.params;
    const plant = await PlantAndTree.findById(id);
    if (!plant) {
      return res.status(404).send("Plant not found");
    }
    await PlantAndTree.findByIdAndDelete(id);
    await EndangeredSpecies.findOneAndDelete({ plant_id: id });
    const park = await NationalPark.findByIdAndUpdate(
      plant.national_park_id,
      { $pull: { plant_ids: id } },
      { new: true, useFindAndModify: false }
    );

    if (park) {
      console.log("Updated National Park:", park);
    }

    res.status(200).send("Plant deleted successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Something went wrong");
  }
});

app.get("/wildlife/Plants-and-Trees/:id/edit",async(req,res)=>{
  let {id}=req.params;
  let plant=await PlantAndTree.findById(id);
  res.render("PlantsAndTrees/editPlant.ejs",{plant});
})

app.put("/wildlife/Plants-and-Trees/:id",async(req,res)=>{
  let {id}=req.params;
  await PlantAndTree.findByIdAndUpdate(id,{...req.body.plant});
  res.redirect("/wildlife/Plants-and-Trees");
})

//endangered
app.get("/wildlife/Endangered-Species",async(req,res)=>{
  let endangeredSpecies=await EndangeredSpecies.find({});
  res.render("EndangeredSpecies/endangeredSpecies.ejs",{endangeredSpecies});
})


//extinct
app.get("/wildlife/Extinct-Species",async(req,res)=>{
  let extinctSpecies=await ExtinctSpecies.find({});
  res.render("ExtinctSpecies/extinctSpecies.ejs",{extinctSpecies});
})


//national parks
app.get("/wildlife/National-Parks",async(req,res)=>{
  let nationalParks=await NationalPark.find({});
  res.render("NationalParks/nationalParks.ejs",{nationalParks});
})

app.get("/wildlife/National-Parks/:id",async(req,res)=>{
  let {id}=req.params;
  let np=await NationalPark.findById(id);
  let animals=[];
  let animalIds=np.animal_ids;
  for(let animal of animalIds){
    let a=await Animal.findById(animal);
    animals.push(a.name);
  }
  let birds=[];
  let birdIds=np.bird_ids;
  for(let bird of birdIds){
    let b=await Bird.findById(bird);
    birds.push(b.name);
  }
  let plantAndTrees=[];
  let ptIds=np.plant_ids;
  for(let pt of ptIds){
    let p=await PlantAndTree.findById(pt);
    plantAndTrees.push(p.name);
  }
  res.render("NationalParks/nationalPark.ejs",{np,animals,birds,plantAndTrees});
})

app.listen(8080,()=>{
    console.log("server is listening to port 8080");
})